import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

import {
  DocumentStatus,
  OutboxStatus,
  VerificationStatus,
} from '../../generated/prisma/client.js';

import { PrismaService } from '../prisma/prisma.service.js';
import { TenantTransactionService } from '../prisma/tenant-transaction.service.js';
import { AuditService } from '../audit/audit.service.js';

import { RIGHT_TO_WORK_VERIFIER } from './providers/right-to-work-verifier.interface.js';

import type { RightToWorkVerifier } from './providers/right-to-work-verifier.interface.js';

const MAX_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 2000;
const BATCH_SIZE = 10;

@Injectable()
export class OutboxProcessorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxProcessorService.name);

  private intervalHandle?: NodeJS.Timeout;
  private processing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantTransaction: TenantTransactionService,
    private readonly auditService: AuditService,
    @Inject(RIGHT_TO_WORK_VERIFIER)
    private readonly verifier: RightToWorkVerifier,
  ) {}

  onModuleInit() {
    this.intervalHandle = setInterval(() => {
      void this.processPendingBatch();
    }, POLL_INTERVAL_MS);

    this.intervalHandle.unref();
  }

  onModuleDestroy() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
    }
  }

  async processPendingBatch(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;

    try {
      const tenants = await this.prisma.tenant.findMany({
        select: {
          id: true,
        },
      });

      for (const tenant of tenants) {
        await this.processTenant(tenant.id);
      }
    } catch (error) {
      this.logger.error(
        'Outbox batch processing failed',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.processing = false;
    }
  }

  private async processTenant(tenantId: string): Promise<void> {
    const events = await this.tenantTransaction.execute(
      tenantId,
      async (tx) => {
        return tx.outboxEvent.findMany({
          where: {
            status: OutboxStatus.PENDING,
          },
          orderBy: {
            createdAt: 'asc',
          },
          take: BATCH_SIZE,
        });
      },
    );

    for (const event of events) {
      await this.claimAndProcess(tenantId, event.id);
    }
  }

  private async claimAndProcess(
    tenantId: string,
    eventId: string,
  ): Promise<void> {
    const claim = await this.tenantTransaction.execute(tenantId, async (tx) => {
      return tx.outboxEvent.updateMany({
        where: {
          id: eventId,
          status: OutboxStatus.PENDING,
        },
        data: {
          status: OutboxStatus.PROCESSING,
          attempts: {
            increment: 1,
          },
        },
      });
    });

    if (claim.count === 0) {
      return;
    }

    try {
      const event = await this.tenantTransaction.execute(
        tenantId,
        async (tx) => {
          return tx.outboxEvent.findUnique({
            where: {
              id: eventId,
            },
          });
        },
      );

      if (!event) {
        return;
      }

      if (event.eventType === 'verification.requested') {
        await this.processVerificationRequested(
          tenantId,
          event.id,
          event.payload,
        );
      }

      if (event.eventType !== 'verification.requested') {
        await this.markProcessed(tenantId, event.id);
      }
    } catch (error) {
      await this.handleProcessingFailure(tenantId, eventId, error);
    }
  }

  private async processVerificationRequested(
    tenantId: string,
    eventId: string,
    payload: unknown,
  ): Promise<void> {
    const { verificationId } = payload as {
      verificationId: string;
      documentId?: string;
    };

    const verificationData = await this.tenantTransaction.execute(
      tenantId,
      async (tx) => {
        const verification = await tx.verification.findFirst({
          where: {
            id: verificationId,
            tenantId,
          },
          include: {
            document: true,
          },
        });

        if (!verification) {
          throw new Error(`Verification ${verificationId} not found`);
        }

        if (
          verification.status === VerificationStatus.VERIFIED ||
          verification.status === VerificationStatus.FAILED
        ) {
          return {
            completed: true,
            documentId: verification.documentId,
          };
        }

        if (verification.status !== VerificationStatus.PENDING) {
          await tx.verification.update({
            where: {
              id: verification.id,
            },
            data: {
              status: VerificationStatus.PENDING,
            },
          });
        }

        return {
          completed: false,
          documentId: verification.documentId,
          documentType: verification.document.type,
          expiryDate: verification.document.expiryDate,
        };
      },
    );

    if (verificationData.completed) {
      await this.markProcessed(tenantId, eventId);
      return;
    }

    const result = await this.verifier.verify({
      documentId: verificationData.documentId,
      documentType: verificationData.documentType!,
      expiryDate: verificationData.expiryDate!,
    });

    await this.tenantTransaction.execute(tenantId, async (tx) => {
      const currentVerification = await tx.verification.findFirst({
        where: {
          id: verificationId,
          tenantId,
        },
        include: {
          document: true,
        },
      });

      if (!currentVerification) {
        throw new Error(`Verification ${verificationId} not found`);
      }

      if (
        currentVerification.status === VerificationStatus.VERIFIED ||
        currentVerification.status === VerificationStatus.FAILED
      ) {
        await tx.outboxEvent.update({
          where: {
            id: eventId,
          },
          data: {
            status: OutboxStatus.PROCESSED,
            processedAt: new Date(),
          },
        });

        return;
      }

      const beforeVerification = currentVerification;
      const beforeDocument = currentVerification.document;

      const finalStatus =
        result.status === VerificationStatus.VERIFIED
          ? VerificationStatus.VERIFIED
          : VerificationStatus.FAILED;

      const updatedVerification = await tx.verification.update({
        where: {
          id: currentVerification.id,
        },
        data: {
          status: finalStatus,
          verifiedAt:
            finalStatus === VerificationStatus.VERIFIED ? new Date() : null,
          failureReason: result.reason ?? null,
        },
      });

      const updatedDocument = await tx.complianceDocument.update({
        where: {
          id: currentVerification.documentId,
        },
        data: {
          status:
            finalStatus === VerificationStatus.VERIFIED
              ? DocumentStatus.VERIFIED
              : DocumentStatus.FAILED,
        },
      });

      await tx.documentVersion.updateMany({
        where: {
          tenantId,
          documentId: currentVerification.documentId,
          version: currentVerification.document.currentVersion,
        },
        data: {
          status:
            finalStatus === VerificationStatus.VERIFIED
              ? DocumentStatus.VERIFIED
              : DocumentStatus.FAILED,
        },
      });

      await this.auditService.recordUpdate(tx, {
        tenantId,
        recordType: 'Verification',
        recordId: currentVerification.id,
        before: beforeVerification,
        after: updatedVerification,
      });

      await this.auditService.recordUpdate(tx, {
        tenantId,
        recordType: 'ComplianceDocument',
        recordId: currentVerification.documentId,
        before: beforeDocument,
        after: updatedDocument,
      });

      await tx.outboxEvent.update({
        where: {
          id: eventId,
        },
        data: {
          status: OutboxStatus.PROCESSED,
          processedAt: new Date(),
        },
      });

      this.logger.log(
        `Processed verification ${currentVerification.id}: ${finalStatus}`,
      );
    });
  }

  private async handleProcessingFailure(
    tenantId: string,
    eventId: string,
    error: unknown,
  ): Promise<void> {
    this.logger.error(
      `Outbox event ${eventId} failed`,
      error instanceof Error ? error.stack : String(error),
    );

    try {
      const event = await this.tenantTransaction.execute(
        tenantId,
        async (tx) => {
          return tx.outboxEvent.findUnique({
            where: {
              id: eventId,
            },
          });
        },
      );

      if (!event) {
        return;
      }

      const shouldRetry = event.attempts < MAX_ATTEMPTS;

      await this.tenantTransaction.execute(tenantId, async (tx) => {
        await tx.outboxEvent.update({
          where: {
            id: eventId,
          },
          data: {
            status: shouldRetry ? OutboxStatus.PENDING : OutboxStatus.FAILED,
          },
        });
      });

      if (!shouldRetry && event.eventType === 'verification.requested') {
        const payload = event.payload as {
          verificationId: string;
        };

        await this.terminallyFailVerification(
          tenantId,
          payload.verificationId,
          'System error: verification could not be processed after repeated attempts',
        );
      }
    } catch (handlingError) {
      this.logger.error(
        `Failed to handle failure for outbox event ${eventId}`,
        handlingError instanceof Error
          ? handlingError.stack
          : String(handlingError),
      );
    }
  }

  private async markProcessed(
    tenantId: string,
    eventId: string,
  ): Promise<void> {
    await this.tenantTransaction.execute(tenantId, async (tx) => {
      await tx.outboxEvent.update({
        where: {
          id: eventId,
        },
        data: {
          status: OutboxStatus.PROCESSED,
          processedAt: new Date(),
        },
      });
    });
  }

  private async terminallyFailVerification(
    tenantId: string,
    verificationId: string,
    reason: string,
  ): Promise<void> {
    await this.tenantTransaction.execute(tenantId, async (tx) => {
      const verification = await tx.verification.findFirst({
        where: {
          id: verificationId,
          tenantId,
        },
      });

      if (
        !verification ||
        verification.status === VerificationStatus.VERIFIED ||
        verification.status === VerificationStatus.FAILED
      ) {
        return;
      }

      const updated = await tx.verification.update({
        where: {
          id: verification.id,
        },
        data: {
          status: VerificationStatus.FAILED,
          failureReason: reason,
        },
      });

      await this.auditService.recordUpdate(tx, {
        tenantId,
        recordType: 'Verification',
        recordId: verification.id,
        before: verification,
        after: updated,
      });
    });
  }
}

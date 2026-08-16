import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { TenantTransactionService } from '../prisma/tenant-transaction.service.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateVerificationDto } from './dto/create-verification.dto.js';
import { IdempotencyService } from '../common/idempotency/idempotency.service.js';

@Injectable()
export class VerificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantTransaction: TenantTransactionService,
    private readonly auditService: AuditService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async requestVerification(
    tenantId: string,
    actorId: string,
    dto: CreateVerificationDto,
    idempotencyKey?: string,
  ) {
    if (idempotencyKey) {
      const requestHash = this.idempotencyService.hashRequest(dto);

      const existing = await this.idempotencyService.getExisting(
        tenantId,
        idempotencyKey,
        requestHash,
      );

      if (existing) {
        if (existing.responseStatus !== null) {
          return existing.responseBody;
        }

        throw new ConflictException(
          'An operation with this idempotency key is already in progress',
        );
      }

      await this.idempotencyService.create(
        tenantId,
        idempotencyKey,
        requestHash,
      );
    }

    try {
      const verification = await this.tenantTransaction.execute(
        tenantId,
        async (tx) => {
          const document = await tx.complianceDocument.findFirst({
            where: {
              id: dto.documentId,
              tenantId,
            },
          });

          if (!document) {
            throw new NotFoundException('Compliance document not found');
          }

          if (document.type !== 'RIGHT_TO_WORK') {
            throw new ConflictException(
              'Only Right-to-Work documents can be verified',
            );
          }

          const active = await tx.verification.findFirst({
            where: {
              documentId: dto.documentId,
              tenantId,
              status: {
                in: ['REQUESTED', 'PENDING'],
              },
            },
          });

          if (active) {
            throw new ConflictException(
              'A verification is already in progress for this document',
            );
          }

          const created = await tx.verification.create({
            data: {
              tenantId,
              documentId: dto.documentId,
              requestedBy: actorId,
              status: 'REQUESTED',
            },
          });

          await tx.outboxEvent.create({
            data: {
              tenantId,
              eventType: 'verification.requested',
              aggregateId: created.id,
              payload: {
                verificationId: created.id,
                documentId: dto.documentId,
              },
            },
          });

          await this.auditService.recordCreate(tx, {
            tenantId,
            actorId,
            recordType: 'Verification',
            recordId: created.id,
            after: created,
          });

          return created;
        },
      );

      if (idempotencyKey) {
        await this.idempotencyService.complete(
          tenantId,
          idempotencyKey,
          201,
          verification,
        );
      }

      return verification;
    } catch (error) {
      if (idempotencyKey) {
        await this.idempotencyService.delete(tenantId, idempotencyKey);
      }

      throw error;
    }
  }

  async getVerificationById(tenantId: string, actorId: string, id: string) {
    return this.tenantTransaction.execute(tenantId, async (tx) => {
      const verification = await tx.verification.findFirst({
        where: { id, tenantId },
      });

      if (!verification) {
        throw new NotFoundException('Verification not found');
      }

      await this.auditService.recordRead(tx, {
        tenantId,
        actorId,
        recordType: 'Verification',
        recordId: verification.id,
        record: verification,
      });

      return verification;
    });
  }
}

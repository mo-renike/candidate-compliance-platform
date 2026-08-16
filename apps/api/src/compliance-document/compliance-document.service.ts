import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, DocumentStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateComplianceDocumentDto } from './dto/create-compliance-document.dto.js';
import { ListComplianceDocumentsDto } from './dto/list-compliance-documents.dto.js';
import { UpdateComplianceDocumentDto } from './dto/update-compliance-document.dto.js';
import { IdempotencyService } from '../common/idempotency/idempotency.service.js';
import { AuditService } from '../audit/audit.service.js';
import { TenantTransactionService } from '../prisma/tenant-transaction.service.js';

@Injectable()
export class ComplianceDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotencyService: IdempotencyService,
    private readonly tenantTransaction: TenantTransactionService,
    private readonly auditService: AuditService,
  ) {}

  async createDocument(
    tenantId: string,
    actorId: string,
    dto: CreateComplianceDocumentDto,
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
      const candidate = await this.prisma.candidate.findFirst({
        where: {
          id: dto.candidateId,
          tenantId,
        },
      });

      if (!candidate) {
        throw new NotFoundException('Candidate not found');
      }

      const document = await this.tenantTransaction.execute(
        tenantId,
        async (tx) => {
          const created = await tx.complianceDocument.create({
            data: {
              tenantId,
              candidateId: dto.candidateId,
              type: dto.type,
              issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
              expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
              status: DocumentStatus.PENDING,
              currentVersion: 1,
            },
          });

          const version = await tx.documentVersion.create({
            data: {
              tenantId,
              documentId: created.id,
              version: 1,
              issueDate: created.issueDate,
              expiryDate: created.expiryDate,
              status: created.status,
              fileReference: dto.fileReference,
            },
          });

          await this.auditService.recordCreate(tx, {
            tenantId,
            actorId,
            recordType: 'DocumentVersion',
            recordId: version.id,
            after: version,
          });

          await this.auditService.recordCreate(tx, {
            tenantId,
            actorId,
            recordType: 'ComplianceDocument',
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
          document,
        );
      }

      return document;
    } catch (error) {
      if (idempotencyKey) {
        await this.idempotencyService.delete(tenantId, idempotencyKey);
      }

      throw error;
    }
  }

  async getAllDocuments(
    tenantId: string,
    actorId: string,
    query: ListComplianceDocumentsDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where = {
      tenantId,
      ...(query.candidateId && { candidateId: query.candidateId }),
      ...(query.type && { type: query.type }),
      ...(query.status && { status: query.status }),
    };

    return this.tenantTransaction.execute(tenantId, async (tx) => {
      const [data, total] = await Promise.all([
        tx.complianceDocument.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            candidate: true,
            versions: { orderBy: { version: 'desc' }, take: 1 },
          },
        }),
        tx.complianceDocument.count({ where }),
      ]);

      await this.auditService.recordReadCollection(tx, {
        tenantId,
        actorId,
        recordType: 'ComplianceDocumentCollection',
        metadata: {
          count: total,
          filters: {
            candidateId: query.candidateId,
            type: query.type,
            status: query.status,
          },
          page,
          limit,
        },
      });

      return {
        data,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    });
  }

  async getExpiringSoon(tenantId: string, actorId: string) {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return this.tenantTransaction.execute(tenantId, async (tx) => {
      const documents = await tx.complianceDocument.findMany({
        where: {
          tenantId,
          expiryDate: { gte: now, lte: thirtyDaysFromNow },
          status: { not: DocumentStatus.SUPERSEDED },
        },
        include: { candidate: true },
        orderBy: { expiryDate: 'asc' },
      });

      await this.auditService.recordReadCollection(tx, {
        tenantId,
        actorId,
        recordType: 'ComplianceDocumentCollection',
        metadata: {
          count: documents.length,
          filter: 'expiringSoon',
        },
      });

      return documents;
    });
  }

  async getDocumentByID(tenantId: string, actorId: string, id: string) {
    return this.tenantTransaction.execute(tenantId, async (tx) => {
      const document = await tx.complianceDocument.findFirst({
        where: {
          id,
          tenantId,
        },
        include: {
          candidate: true,
          versions: {
            orderBy: {
              version: 'desc',
            },
          },
        },
      });

      if (!document) {
        throw new NotFoundException('Compliance document not found');
      }

      await this.auditService.recordRead(tx, {
        tenantId,
        actorId,
        recordType: 'ComplianceDocument',
        recordId: id,
        record: document,
      });

      return document;
    });
  }

  async updateDocument(
    tenantId: string,
    actorId: string,
    id: string,
    dto: UpdateComplianceDocumentDto,
  ) {
    return this.tenantTransaction.execute(tenantId, async (tx) => {
      const existing = await tx.complianceDocument.findFirst({
        where: {
          id,
          tenantId,
        },
      });

      if (!existing) {
        throw new NotFoundException('Compliance document not found');
      }

      if (dto.candidateId && dto.candidateId !== existing.candidateId) {
        const candidate = await tx.candidate.findFirst({
          where: {
            id: dto.candidateId,
            tenantId,
          },
        });

        if (!candidate) {
          throw new NotFoundException('Candidate not found');
        }
      }

      const nextVersion = existing.currentVersion + 1;

      const latestVersion = await this.getLatestVersionId(tx, tenantId, id);

      const updated = await tx.complianceDocument.update({
        where: { id },
        data: {
          candidateId: dto.candidateId,
          type: dto.type,
          issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
          currentVersion: nextVersion,
          status: DocumentStatus.PENDING,
        },
      });

      const newVersion = await tx.documentVersion.create({
        data: {
          tenantId,
          documentId: id,
          version: nextVersion,
          issueDate: updated.issueDate,
          expiryDate: updated.expiryDate,
          status: DocumentStatus.PENDING,
          fileReference: dto.fileReference,
          supersedesVersionId: latestVersion,
        },
      });

      await this.auditService.recordCreate(tx, {
        tenantId,
        actorId,
        recordType: 'DocumentVersion',
        recordId: newVersion.id,
        after: newVersion,
      });

      await this.auditService.recordUpdate(tx, {
        tenantId,
        actorId,
        recordType: 'ComplianceDocument',
        recordId: id,
        before: existing,
        after: updated,
      });

      return { ...updated, newVersion };
    });
  }

  async deleteDocument(tenantId: string, id: string) {
    const document = await this.prisma.complianceDocument.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!document) {
      throw new NotFoundException('Compliance document not found');
    }

    throw new ConflictException(
      'Compliance documents are immutable and cannot be deleted',
    );
  }

  private async getLatestVersionId(
    tx: Prisma.TransactionClient,
    tenantId: string,
    documentId: string,
  ): Promise<string | undefined> {
    const latest = await tx.documentVersion.findFirst({
      where: { tenantId, documentId },
      orderBy: {
        version: 'desc',
      },
      select: {
        id: true,
      },
    });

    return latest?.id;
  }
}

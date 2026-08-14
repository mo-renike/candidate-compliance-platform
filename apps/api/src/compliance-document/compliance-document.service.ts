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
import { createHash } from 'node:crypto';
import { IdempotencyService } from '../common/idempotency/idempotency.service.js';

@Injectable()
export class ComplianceDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotencyService: IdempotencyService,
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

      const document = await this.prisma.$transaction(async (tx) => {
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

        await tx.documentVersion.create({
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

        await tx.auditEvent.create({
          data: {
            tenantId,
            actorId,
            action: 'CREATE',
            recordType: 'ComplianceDocument',
            recordId: created.id,
            afterHash: this.hashRecord(created),
          },
        });

        return created;
      });

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

  async getAllDocuments(tenantId: string, query: ListComplianceDocumentsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where = {
      tenantId,
      ...(query.candidateId && {
        candidateId: query.candidateId,
      }),
      ...(query.type && {
        type: query.type,
      }),
      ...(query.status && {
        status: query.status,
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.complianceDocument.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          candidate: true,
          versions: {
            orderBy: {
              version: 'desc',
            },
            take: 1,
          },
        },
      }),
      this.prisma.complianceDocument.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDocumentByID(tenantId: string, actorId: string, id: string) {
    const document = await this.prisma.complianceDocument.findFirst({
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

    await this.prisma.auditEvent.create({
      data: {
        tenantId,
        actorId,
        action: 'READ',
        recordType: 'ComplianceDocument',
        recordId: id,
        afterHash: this.hashRecord(document),
      },
    });

    return document;
  }

  async updateDocument(
    tenantId: string,
    actorId: string,
    id: string,
    dto: UpdateComplianceDocumentDto,
  ) {
    const existing = await this.prisma.complianceDocument.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Compliance document not found');
    }

    if (dto.candidateId && dto.candidateId !== existing.candidateId) {
      const candidate = await this.prisma.candidate.findFirst({
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

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.complianceDocument.update({
        where: {
          id,
        },
        data: {
          candidateId: dto.candidateId,
          type: dto.type,
          issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
          currentVersion: nextVersion,
        },
      });

      await tx.documentVersion.create({
        data: {
          tenantId,
          documentId: id,
          version: nextVersion,
          issueDate: updated.issueDate,
          expiryDate: updated.expiryDate,
          status: updated.status,
          fileReference: dto.fileReference,
          supersedesVersionId: await this.getLatestVersionId(tx, id),
        },
      });

      await tx.auditEvent.create({
        data: {
          tenantId,
          actorId,
          action: 'UPDATE',
          recordType: 'ComplianceDocument',
          recordId: id,
          beforeHash: this.hashRecord(existing),
          afterHash: this.hashRecord(updated),
        },
      });

      return updated;
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

  async getExpiringSoon(tenantId: string) {
    const now = new Date();

    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return this.prisma.complianceDocument.findMany({
      where: {
        tenantId,
        expiryDate: {
          gte: now,
          lte: thirtyDaysFromNow,
        },
        status: {
          not: DocumentStatus.SUPERSEDED,
        },
      },
      include: {
        candidate: true,
      },
      orderBy: {
        expiryDate: 'asc',
      },
    });
  }

  private async getLatestVersionId(
    tx: Prisma.TransactionClient,
    documentId: string,
  ): Promise<string | undefined> {
    const latest = await tx.documentVersion.findFirst({
      where: {
        documentId,
      },
      orderBy: {
        version: 'desc',
      },
      select: {
        id: true,
      },
    });

    return latest?.id;
  }

  private hashRecord(record: unknown): string {
    return createHash('sha256').update(JSON.stringify(record)).digest('hex');
  }
}

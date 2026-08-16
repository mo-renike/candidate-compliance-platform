import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { AuditAction, Prisma } from '../../generated/prisma/client.js';

@Injectable()
export class AuditService {
  hash(value: unknown): string {
    return createHash('sha256')
      .update(JSON.stringify(value ?? null))
      .digest('hex');
  }

  async recordCreate(
    tx: Prisma.TransactionClient,
    params: {
      tenantId: string;
      actorId?: string;
      recordType: string;
      recordId: string;
      after: unknown;
    },
  ) {
    return tx.auditEvent.create({
      data: {
        tenantId: params.tenantId,
        actorId: params.actorId,
        action: AuditAction.CREATE,
        recordType: params.recordType,
        recordId: params.recordId,
        afterHash: this.hash(params.after),
      },
    });
  }

  async recordUpdate(
    tx: Prisma.TransactionClient,
    params: {
      tenantId: string;
      actorId?: string;
      recordType: string;
      recordId: string;
      before: unknown;
      after: unknown;
    },
  ) {
    return tx.auditEvent.create({
      data: {
        tenantId: params.tenantId,
        actorId: params.actorId,
        action: AuditAction.UPDATE,
        recordType: params.recordType,
        recordId: params.recordId,
        beforeHash: this.hash(params.before),
        afterHash: this.hash(params.after),
      },
    });
  }

  async recordRead(
    tx: Prisma.TransactionClient,
    params: {
      tenantId: string;
      actorId?: string;
      recordType: string;
      recordId: string;
      record: unknown;
    },
  ) {
    return tx.auditEvent.create({
      data: {
        tenantId: params.tenantId,
        actorId: params.actorId,
        action: AuditAction.READ,
        recordType: params.recordType,
        recordId: params.recordId,
        afterHash: this.hash(params.record),
      },
    });
  }

  async recordDelete(
    tx: Prisma.TransactionClient,
    params: {
      tenantId: string;
      actorId?: string;
      recordType: string;
      recordId: string;
      before: unknown;
    },
  ) {
    return tx.auditEvent.create({
      data: {
        tenantId: params.tenantId,
        actorId: params.actorId,
        action: AuditAction.DELETE,
        recordType: params.recordType,
        recordId: params.recordId,
        beforeHash: this.hash(params.before),
      },
    });
  }

  async recordReadCollection(
    tx: Prisma.TransactionClient,
    params: {
      tenantId: string;
      actorId?: string;
      recordType: string;
      metadata: Prisma.InputJsonValue;
    },
  ) {
    return tx.auditEvent.create({
      data: {
        tenantId: params.tenantId,
        actorId: params.actorId,
        action: AuditAction.READ,
        recordType: params.recordType,
        metadata: params.metadata,
      },
    });
  }
}

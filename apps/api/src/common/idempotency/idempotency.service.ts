import { ConflictException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '../../../generated/prisma/client.js';
import { TenantTransactionService } from '../../prisma/tenant-transaction.service.js';

@Injectable()
export class IdempotencyService {
  constructor(private readonly tenantTransaction: TenantTransactionService) {}

  hashRequest(body: unknown): string {
    return createHash('sha256').update(JSON.stringify(body)).digest('hex');
  }

  async getExisting(tenantId: string, key: string, requestHash: string) {
    return this.tenantTransaction.execute(tenantId, async (tx) => {
      const existing = await tx.idempotencyKey.findUnique({
        where: {
          tenantId_key: {
            tenantId,
            key,
          },
        },
      });

      if (!existing) {
        return null;
      }

      if (existing.requestHash !== requestHash) {
        throw new ConflictException(
          'Idempotency key has already been used with a different request',
        );
      }

      return existing;
    });
  }

  async create(tenantId: string, key: string, requestHash: string) {
    try {
      return await this.tenantTransaction.execute(tenantId, async (tx) => {
        return tx.idempotencyKey.create({
          data: {
            tenantId,
            key,
            requestHash,
          },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An operation with this idempotency key is already in progress',
        );
      }

      throw error;
    }
  }

  async complete(
    tenantId: string,
    key: string,
    responseStatus: number,
    responseBody: unknown,
  ) {
    return this.tenantTransaction.execute(tenantId, async (tx) => {
      return tx.idempotencyKey.update({
        where: {
          tenantId_key: {
            tenantId,
            key,
          },
        },
        data: {
          responseStatus,
          responseBody: responseBody as object,
        },
      });
    });
  }

  async delete(tenantId: string, key: string) {
    return this.tenantTransaction.execute(tenantId, async (tx) => {
      await tx.idempotencyKey.delete({
        where: {
          tenantId_key: {
            tenantId,
            key,
          },
        },
      });
    });
  }
}

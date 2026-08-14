import { ConflictException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  hashRequest(body: unknown): string {
    return createHash('sha256').update(JSON.stringify(body)).digest('hex');
  }

  async getExisting(tenantId: string, key: string, requestHash: string) {
    const existing = await this.prisma.idempotencyKey.findUnique({
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
  }

  async create(tenantId: string, key: string, requestHash: string) {
    try {
      return await this.prisma.idempotencyKey.create({
        data: {
          tenantId,
          key,
          requestHash,
        },
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
    return this.prisma.idempotencyKey.update({
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
  }
  async delete(tenantId: string, key: string) {
    await this.prisma.idempotencyKey.delete({
      where: {
        tenantId_key: {
          tenantId,
          key,
        },
      },
    });
  }
}

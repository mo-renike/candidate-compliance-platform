import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';

@Injectable()
export class TenantTransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async execute<T>(
    tenantId: string,
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        SELECT set_config('app.tenant_id', ${tenantId}, true)
      `;

      return callback(tx);
    });
  }
}

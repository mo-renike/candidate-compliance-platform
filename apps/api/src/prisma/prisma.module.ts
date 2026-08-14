import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { TenantTransactionService } from './tenant-transaction.service.js';

@Global()
@Module({
  providers: [PrismaService, TenantTransactionService],
  exports: [PrismaService, TenantTransactionService],
})
export class PrismaModule {}

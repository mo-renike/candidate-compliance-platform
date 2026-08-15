import { Module } from '@nestjs/common';
import { ComplianceDocumentsController } from './compliance-document.controller.js';
import { ComplianceDocumentsService } from './compliance-document.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { IdempotencyModule } from '../common/idempotency/idempotency.module.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [PrismaModule, AuthModule, IdempotencyModule, AuditModule],
  controllers: [ComplianceDocumentsController],
  providers: [ComplianceDocumentsService],
})
export class ComplianceDocumentModule {}

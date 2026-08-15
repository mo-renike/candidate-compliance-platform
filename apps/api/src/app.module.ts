import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { CandidatesModule } from './candidates/candidates.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ComplianceDocumentModule } from './compliance-document/compliance-document.module.js';
import { IdempotencyModule } from './common/idempotency/idempotency.module.js';
import { AuditModule } from './audit/audit.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    CandidatesModule,
    ComplianceDocumentModule,
    IdempotencyModule,
    AuditModule,
  ],
})
export class AppModule {}

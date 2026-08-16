import { Module } from '@nestjs/common';
import { VerificationsService } from './verification.service.js';
import { VerificationsController } from './verification.controller.js';
import { AuditModule } from '../audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { IdempotencyModule } from '../common/idempotency/idempotency.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { OutboxProcessorService } from './outbox-processor.service.js';
import { RIGHT_TO_WORK_VERIFIER } from './providers/right-to-work-verifier.interface.js';
import { MockRightToWorkVerifier } from './providers/mock-right-to-work-verifier.provider.js';

@Module({
  imports: [PrismaModule, AuthModule, IdempotencyModule, AuditModule],
  controllers: [VerificationsController],
  providers: [
    VerificationsService,
    OutboxProcessorService,
    { provide: RIGHT_TO_WORK_VERIFIER, useClass: MockRightToWorkVerifier },
  ],
})
export class VerificationModule {}

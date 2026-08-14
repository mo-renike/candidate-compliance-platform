import { Module } from '@nestjs/common';
import { CandidatesService } from './candidates.service.js';
import { CandidatesController } from './candidates.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [CandidatesController],
  providers: [CandidatesService],
})
export class CandidatesModule {}

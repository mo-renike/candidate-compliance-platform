import { Module } from '@nestjs/common';
import { AiCvExtractionController } from './ai-extraction.controller.js';
import { AiCvExtractionService } from './ai-cv-extraction.service.js';
import { AuditModule } from '../audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { MockCvExtractionProvider } from './providers/mock-cv-extraction.provider.js';
import { CV_EXTRACTION_PROVIDER } from './providers/cv-extractor.interface.js';
import { CvTextExtractorService } from './cv-text-extractor.service.js';

@Module({
  imports: [PrismaModule, AuthModule, AuditModule],
  controllers: [AiCvExtractionController],
  providers: [
    AiCvExtractionService,
    CvTextExtractorService,
    { provide: CV_EXTRACTION_PROVIDER, useClass: MockCvExtractionProvider },
  ],
})
export class AiExtractionModule {}

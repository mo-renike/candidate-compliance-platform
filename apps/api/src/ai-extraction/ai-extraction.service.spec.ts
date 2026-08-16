import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { AiCvExtractionService } from './ai-cv-extraction.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TenantTransactionService } from '../prisma/tenant-transaction.service.js';
import { AuditService } from '../audit/audit.service.js';
import { CvTextExtractorService } from './cv-text-extractor.service.js';
import { CV_EXTRACTION_PROVIDER } from './providers/cv-extractor.interface.js';

describe('AiCvExtractionService', () => {
  let service: AiCvExtractionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiCvExtractionService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: TenantTransactionService,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            hash: jest.fn(),
            recordCreate: jest.fn(),
            recordRead: jest.fn(),
            recordUpdate: jest.fn(),
          },
        },
        {
          provide: CvTextExtractorService,
          useValue: {
            extractText: jest.fn(),
          },
        },
        {
          provide: CV_EXTRACTION_PROVIDER,
          useValue: {
            modelName: 'test-model',
            extract: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AiCvExtractionService>(AiCvExtractionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

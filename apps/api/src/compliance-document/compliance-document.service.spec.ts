import { Test, TestingModule } from '@nestjs/testing';
import { ComplianceDocumentsService } from './compliance-document.service.js';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { PrismaService } from '../prisma/prisma.service.js';
import { IdempotencyService } from '../common/idempotency/idempotency.service.js';
import { TenantTransactionService } from '../prisma/tenant-transaction.service.js';
import { AuditService } from '../audit/audit.service.js';

describe('ComplianceDocumentsService', () => {
  let service: ComplianceDocumentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceDocumentsService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: IdempotencyService,
          useValue: {
            hashRequest: jest.fn(),
            getExisting: jest.fn(),
            create: jest.fn(),
            complete: jest.fn(),
            delete: jest.fn(),
          },
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
            recordCreate: jest.fn(),
            recordUpdate: jest.fn(),
            recordRead: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ComplianceDocumentsService>(
      ComplianceDocumentsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { CandidatesService } from './candidates.service.js';
import { TenantTransactionService } from '../prisma/tenant-transaction.service.js';
import { AuditService } from '../audit/audit.service.js';

describe('CandidatesService', () => {
  let service: CandidatesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidatesService,
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

    service = module.get<CandidatesService>(CandidatesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

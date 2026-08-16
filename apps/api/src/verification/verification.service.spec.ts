import { Test, TestingModule } from '@nestjs/testing';
import { VerificationsService } from './verification.service.js';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { PrismaService } from '../prisma/prisma.service.js';
import { TenantTransactionService } from '../prisma/tenant-transaction.service.js';
import { AuditService } from '../audit/audit.service.js';
import { IdempotencyService } from '../common/idempotency/idempotency.service.js';

describe('VerificationsService', () => {
  let service: VerificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationsService,
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
            recordCreate: jest.fn(),
            recordRead: jest.fn(),
          },
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
      ],
    }).compile();

    service = module.get<VerificationsService>(VerificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

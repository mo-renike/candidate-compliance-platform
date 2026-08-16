import { Test, TestingModule } from '@nestjs/testing';
import { CandidatesController } from './candidates.controller.js';
import { CandidatesService } from './candidates.service.js';

import { JwtAuthGuard } from '../auth/guard/auth.guard.js';
import { PermissionsGuard } from '../auth/guard/permissions.guard.js';
import { TenantContextGuard } from '../auth/guard/tenant-context.guard.js';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('CandidatesController', () => {
  let controller: CandidatesController;

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [CandidatesController],
      providers: [
        {
          provide: CandidatesService,
          useValue: {
            createCandidate: jest.fn(),
            getAllCandidates: jest.fn(),
            getCandidateById: jest.fn(),
            updateCandidate: jest.fn(),
          },
        },
      ],
    });

    moduleBuilder
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .overrideGuard(TenantContextGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .overrideGuard(PermissionsGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      });

    const module: TestingModule = await moduleBuilder.compile();

    controller = module.get<CandidatesController>(CandidatesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

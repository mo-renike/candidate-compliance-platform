import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { AiCvExtractionController } from './ai-extraction.controller.js';
import { AiCvExtractionService } from './ai-cv-extraction.service.js';

import { JwtAuthGuard } from '../auth/guard/auth.guard.js';
import { TenantContextGuard } from '../auth/guard/tenant-context.guard.js';
import { PermissionsGuard } from '../auth/guard/permissions.guard.js';

describe('AiCvExtractionController', () => {
  let controller: AiCvExtractionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiCvExtractionController],
      providers: [
        {
          provide: AiCvExtractionService,
          useValue: {
            createExtraction: jest.fn(),
            getExtractionById: jest.fn(),
            confirmExtraction: jest.fn(),
          },
        },
      ],
    })
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
      })
      .compile();

    controller = module.get<AiCvExtractionController>(AiCvExtractionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

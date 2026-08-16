import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { VerificationsController } from './verification.controller.js';
import { VerificationsService } from './verification.service.js';

import { JwtAuthGuard } from '../auth/guard/auth.guard.js';
import { TenantContextGuard } from '../auth/guard/tenant-context.guard.js';
import { PermissionsGuard } from '../auth/guard/permissions.guard.js';

describe('VerificationsController', () => {
  let controller: VerificationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VerificationsController],
      providers: [
        {
          provide: VerificationsService,
          useValue: {
            requestVerification: jest.fn(),
            getVerificationById: jest.fn(),
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

    controller = module.get<VerificationsController>(VerificationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

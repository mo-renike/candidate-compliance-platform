import { Test, TestingModule } from '@nestjs/testing';
import { ComplianceDocumentsController } from './compliance-document.controller.js';
import { ComplianceDocumentsService } from './compliance-document.service.js';

import { JwtAuthGuard } from '../auth/guard/auth.guard.js';
import { PermissionsGuard } from '../auth/guard/permissions.guard.js';
import { TenantContextGuard } from '../auth/guard/tenant-context.guard.js';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('ComplianceDocumentsController', () => {
  let controller: ComplianceDocumentsController;

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [ComplianceDocumentsController],
      providers: [
        {
          provide: ComplianceDocumentsService,
          useValue: {
            createDocument: jest.fn(),
            getAllDocuments: jest.fn(),
            getExpiringSoon: jest.fn(),
            getDocumentByID: jest.fn(),
            updateDocument: jest.fn(),
            deleteDocument: jest.fn(),
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

    controller = module.get<ComplianceDocumentsController>(
      ComplianceDocumentsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

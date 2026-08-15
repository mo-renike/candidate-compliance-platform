import { Test, TestingModule } from '@nestjs/testing';
import { ComplianceDocumentsController } from './compliance-document.controller.js';
import { ComplianceDocumentsService } from './compliance-document.service.js';

import { beforeEach, describe, expect, it } from '@jest/globals';

describe('ComplianceDocumentsController', () => {
  let controller: ComplianceDocumentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComplianceDocumentsController],
      providers: [ComplianceDocumentsService],
    }).compile();

    controller = module.get<ComplianceDocumentsController>(
      ComplianceDocumentsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

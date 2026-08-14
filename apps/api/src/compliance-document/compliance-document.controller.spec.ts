import { Test, TestingModule } from '@nestjs/testing';
import { ComplianceDocumentController } from './compliance-document.controller';
import { ComplianceDocumentService } from './compliance-document.service';

describe('ComplianceDocumentController', () => {
  let controller: ComplianceDocumentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComplianceDocumentController],
      providers: [ComplianceDocumentService],
    }).compile();

    controller = module.get<ComplianceDocumentController>(ComplianceDocumentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

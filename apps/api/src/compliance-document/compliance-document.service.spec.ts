import { Test, TestingModule } from '@nestjs/testing';
import { ComplianceDocumentService } from './compliance-document.service';

describe('ComplianceDocumentService', () => {
  let service: ComplianceDocumentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ComplianceDocumentService],
    }).compile();

    service = module.get<ComplianceDocumentService>(ComplianceDocumentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

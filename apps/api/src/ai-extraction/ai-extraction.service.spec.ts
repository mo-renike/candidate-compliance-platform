import { Test, TestingModule } from '@nestjs/testing';
import { AiExtractionService } from './ai-extraction.service';

describe('AiExtractionService', () => {
  let service: AiExtractionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiExtractionService],
    }).compile();

    service = module.get<AiExtractionService>(AiExtractionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

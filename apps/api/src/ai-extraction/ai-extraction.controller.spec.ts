import { Test, TestingModule } from '@nestjs/testing';
import { AiExtractionController } from './ai-extraction.controller';
import { AiExtractionService } from './ai-extraction.service';

describe('AiExtractionController', () => {
  let controller: AiExtractionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiExtractionController],
      providers: [AiExtractionService],
    }).compile();

    controller = module.get<AiExtractionController>(AiExtractionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

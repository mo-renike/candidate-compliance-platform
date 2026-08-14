import { Test, TestingModule } from '@nestjs/testing';
import { CandidatesController } from './candidates.controller.js';
import { CandidatesService } from './candidates.service.js';

describe('CandidatesController', () => {
  let controller: CandidatesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CandidatesController],
      providers: [CandidatesService],
    }).compile();

    controller = module.get<CandidatesController>(CandidatesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { VerificationController } from './verification.controller.js';
import { VerificationService } from './verification.service.js';

describe('VerificationController', () => {
  let controller: VerificationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VerificationController],
      providers: [VerificationService],
    }).compile();

    controller = module.get<VerificationController>(VerificationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

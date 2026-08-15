import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

import { beforeEach, describe, expect, it } from '@jest/globals';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [AuthService],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

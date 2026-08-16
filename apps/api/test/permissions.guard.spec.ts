import 'dotenv/config';

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { PermissionsGuard } from '../src/auth/guard/permissions.guard.js';
import { Permission } from '../src/auth/permissions/permissions.js';
import { UserRole } from '../generated/prisma/enums.js';
import { AuthenticatedUser } from '../src/common/interfaces/authenticated-request.interface.js';

type ReflectorGetAllAndOverrideFn = (
  key: string,
  targets: unknown[],
) => Permission[] | undefined;

const makeContext = (user?: Partial<AuthenticatedUser>): ExecutionContext => {
  const request = { user };

  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
};

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: {
    getAllAndOverride: jest.Mock<ReflectorGetAllAndOverrideFn>;
  };

  beforeEach(async () => {
    reflector = {
      getAllAndOverride: jest.fn<ReflectorGetAllAndOverrideFn>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        { provide: Reflector, useValue: reflector },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
  });

  it('allows access when the route has no @RequirePermissions decorator', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const context = makeContext({ role: UserRole.RECRUITER });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when the user has the single required permission', () => {
    reflector.getAllAndOverride.mockReturnValue([Permission.READ_CANDIDATE]);

    const context = makeContext({ role: UserRole.RECRUITER });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies access when the user lacks the required permission', () => {
    reflector.getAllAndOverride.mockReturnValue([Permission.DELETE_DOCUMENT]);

    const context = makeContext({ role: UserRole.RECRUITER });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('requires ALL listed permissions, not just one of them', () => {
    reflector.getAllAndOverride.mockReturnValue([
      Permission.READ_DOCUMENT,
      Permission.DELETE_DOCUMENT,
    ]);

    const context = makeContext({ role: UserRole.COMPLIANCE_MANAGER });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('denies access when the role has no entry in ROLE_PERMISSIONS', () => {
    reflector.getAllAndOverride.mockReturnValue([Permission.READ_CANDIDATE]);

    const context = makeContext({ role: 'UNKNOWN_ROLE' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('denies access when the request has no authenticated user', () => {
    reflector.getAllAndOverride.mockReturnValue([Permission.READ_CANDIDATE]);

    const context = makeContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});

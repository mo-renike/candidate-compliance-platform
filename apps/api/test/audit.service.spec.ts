import 'dotenv/config';

import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import { AuditService } from '../src/audit/audit.service.js';
import { CandidatesService } from '../src/candidates/candidates.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { TenantTransactionService } from '../src/prisma/tenant-transaction.service.js';

import { AuditAction, Prisma } from '../generated/prisma/client.js';
import { AuthenticatedUser } from '../src/common/interfaces/authenticated-request.interface.js';

//Shared local types for mocks

interface CandidateRecord {
  id: string;
  name: string;
  email: string;
  tenantId: string;
  roleAppliedFor: string;
}

interface AuditEventInsertData {
  tenantId: string;
  actorId?: string;
  action: AuditAction;
  recordType: string;
  recordId: string;
  beforeHash?: string;
  afterHash?: string;
}

type AuditEventCreateFn = (args: {
  data: AuditEventInsertData;
}) => Promise<{ id: string }>;

type AuditRecordCreateParams = Parameters<AuditService['recordCreate']>[1];
type AuditRecordUpdateParams = Parameters<AuditService['recordUpdate']>[1];
type AuditRecordReadParams = Parameters<AuditService['recordRead']>[1];

type RecordCreateFn = (
  tx: unknown,
  params: AuditRecordCreateParams,
) => Promise<void>;
type RecordUpdateFn = (
  tx: unknown,
  params: AuditRecordUpdateParams,
) => Promise<void>;
type RecordReadFn = (
  tx: unknown,
  params: AuditRecordReadParams,
) => Promise<void>;

type TxCandidateCreateFn = (args: {
  data: Record<string, unknown>;
}) => Promise<CandidateRecord>;
type TxCandidateFindFirstFn = (
  args: Record<string, unknown>,
) => Promise<CandidateRecord | null>;
type TxCandidateFindUniqueFn = (
  args: Record<string, unknown>,
) => Promise<CandidateRecord | null>;
type TxCandidateUpdateFn = (
  args: Record<string, unknown>,
) => Promise<CandidateRecord>;

interface MockTx {
  candidate: {
    create: jest.Mock<TxCandidateCreateFn>;
    findFirst: jest.Mock<TxCandidateFindFirstFn>;
    findUnique: jest.Mock<TxCandidateFindUniqueFn>;
    update: jest.Mock<TxCandidateUpdateFn>;
  };
}

type TenantExecuteCallback = (tx: MockTx) => Promise<unknown>;
type TenantExecuteFn = (
  tenantId: string,
  callback: TenantExecuteCallback,
) => Promise<unknown>;

interface MockTenantTransaction {
  execute: jest.Mock<TenantExecuteFn>;
}

interface MockAuditService {
  recordCreate: jest.Mock<RecordCreateFn>;
  recordUpdate: jest.Mock<RecordUpdateFn>;
  recordRead: jest.Mock<RecordReadFn>;
}

type CreateCandidateInput = Parameters<CandidatesService['createCandidate']>[0];
type UpdateCandidateInput = Parameters<CandidatesService['updateCandidate']>[1];

// 1. AuditService — unit tests

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditService],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  const makeTx = () => {
    const create = jest
      .fn<AuditEventCreateFn>()
      .mockResolvedValue({ id: 'audit_1' });

    const tx = {
      auditEvent: {
        create,
      },
    } as unknown as Prisma.TransactionClient;

    return { tx, create };
  };

  it('hashes deterministically and treats undefined/null the same', () => {
    expect(service.hash(undefined)).toBe(service.hash(null));

    expect(service.hash({ a: 1 })).toBe(service.hash({ a: 1 }));

    expect(service.hash({ a: 1 })).not.toBe(service.hash({ a: 2 }));
  });

  it('recordCreate writes a CREATE event with only afterHash set', async () => {
    const { tx, create } = makeTx();

    const after = {
      id: 'c1',
      name: 'Jane',
    };

    await service.recordCreate(tx, {
      tenantId: 't1',
      actorId: 'u1',
      recordType: 'Candidate',
      recordId: 'c1',
      after,
    });

    expect(create).toHaveBeenCalledTimes(1);

    const { data } = create.mock.calls[0][0];

    expect(data.action).toBe(AuditAction.CREATE);
    expect(data.tenantId).toBe('t1');
    expect(data.actorId).toBe('u1');
    expect(data.recordType).toBe('Candidate');
    expect(data.recordId).toBe('c1');

    expect(data.afterHash).toBe(service.hash(after));

    expect(data.beforeHash).toBeUndefined();
  });

  it('recordUpdate writes an UPDATE event with both beforeHash and afterHash', async () => {
    const { tx, create } = makeTx();

    const before = {
      id: 'c1',
      name: 'Jane',
    };

    const after = {
      id: 'c1',
      name: 'Jane Doe',
    };

    await service.recordUpdate(tx, {
      tenantId: 't1',
      actorId: 'u1',
      recordType: 'Candidate',
      recordId: 'c1',
      before,
      after,
    });

    expect(create).toHaveBeenCalledTimes(1);

    const { data } = create.mock.calls[0][0];

    expect(data.action).toBe(AuditAction.UPDATE);

    expect(data.beforeHash).toBe(service.hash(before));

    expect(data.afterHash).toBe(service.hash(after));

    expect(data.beforeHash).not.toBe(data.afterHash);
  });

  it('recordRead writes a READ event', async () => {
    const { tx, create } = makeTx();

    const record = {
      id: 'c1',
      name: 'Jane',
    };

    await service.recordRead(tx, {
      tenantId: 't1',
      actorId: 'u1',
      recordType: 'Candidate',
      recordId: 'c1',
      record,
    });

    expect(create).toHaveBeenCalledTimes(1);

    const { data } = create.mock.calls[0][0];

    expect(data.action).toBe(AuditAction.READ);

    expect(data.afterHash).toBe(service.hash(record));

    expect(data.beforeHash).toBeUndefined();
  });
});

// 2. CandidatesService — audit integration

describe('CandidatesService — audit integration', () => {
  let service: CandidatesService;

  let tenantTransaction: MockTenantTransaction;
  let auditService: MockAuditService;

  const user = {
    id: 'u1',
    tenantId: 't1',
  } as AuthenticatedUser;

  const tx: MockTx = {
    candidate: {
      create: jest.fn<TxCandidateCreateFn>(),
      findFirst: jest.fn<TxCandidateFindFirstFn>(),
      findUnique: jest.fn<TxCandidateFindUniqueFn>(),
      update: jest.fn<TxCandidateUpdateFn>(),
    },
  };

  beforeEach(async () => {
    tenantTransaction = {
      execute: jest.fn<TenantExecuteFn>(),
    };

    auditService = {
      recordCreate: jest.fn<RecordCreateFn>().mockResolvedValue(undefined),
      recordUpdate: jest.fn<RecordUpdateFn>().mockResolvedValue(undefined),
      recordRead: jest.fn<RecordReadFn>().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidatesService,

        {
          provide: TenantTransactionService,
          useValue: tenantTransaction,
        },
        {
          provide: AuditService,
          useValue: auditService,
        },
      ],
    }).compile();

    service = module.get<CandidatesService>(CandidatesService);

    jest.clearAllMocks();

    tenantTransaction.execute.mockImplementation(
      async (_tenantId: string, callback: TenantExecuteCallback) =>
        callback(tx),
    );
  });

  describe('createCandidate', () => {
    it('creates the candidate and records a CREATE audit event', async () => {
      tx.candidate.findUnique.mockResolvedValue(null);

      const created: CandidateRecord = {
        id: 'c1',
        name: 'Jane',
        email: 'jane@x.com',
        tenantId: 't1',
        roleAppliedFor: 'Engineer',
      };

      tx.candidate.create.mockResolvedValue(created);

      const input: CreateCandidateInput = {
        name: 'Jane',
        email: 'jane@x.com',
        roleAppliedFor: 'Engineer',
      };

      const result = await service.createCandidate(input, user);

      expect(result).toEqual(created);

      expect(tenantTransaction.execute).toHaveBeenCalledWith(
        't1',
        expect.any(Function),
      );

      expect(tx.candidate.findUnique).toHaveBeenCalledWith({
        where: {
          tenantId_email: {
            tenantId: 't1',
            email: 'jane@x.com',
          },
        },
      });

      expect(auditService.recordCreate).toHaveBeenCalledTimes(1);

      expect(auditService.recordCreate).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({
          tenantId: 't1',
          actorId: 'u1',
          recordType: 'Candidate',
          recordId: 'c1',
          after: created,
        }),
      );
    });

    it('throws ConflictException and does not create an audit event on duplicate email', async () => {
      tx.candidate.findUnique.mockResolvedValue({
        id: 'existing',
        name: 'Existing',
        email: 'jane@x.com',
        tenantId: 't1',
        roleAppliedFor: 'Engineer',
      });

      const input: CreateCandidateInput = {
        name: 'Jane',
        email: 'jane@x.com',
        roleAppliedFor: 'Engineer',
      };

      await expect(service.createCandidate(input, user)).rejects.toThrow(
        ConflictException,
      );

      expect(tenantTransaction.execute).toHaveBeenCalledTimes(1);

      expect(tx.candidate.findUnique).toHaveBeenCalledTimes(1);

      expect(tx.candidate.create).not.toHaveBeenCalled();

      expect(auditService.recordCreate).not.toHaveBeenCalled();
    });

    it('propagates audit failure after candidate creation', async () => {
      tx.candidate.findUnique.mockResolvedValue(null);

      const created: CandidateRecord = {
        id: 'c1',
        name: 'Jane',
        email: 'jane@x.com',
        tenantId: 't1',
        roleAppliedFor: 'Engineer',
      };

      tx.candidate.create.mockResolvedValue(created);

      auditService.recordCreate.mockRejectedValue(
        new Error('Audit database failure'),
      );

      const input: CreateCandidateInput = {
        name: 'Jane',
        email: 'jane@x.com',
        roleAppliedFor: 'Engineer',
      };

      await expect(service.createCandidate(input, user)).rejects.toThrow(
        'Audit database failure',
      );

      expect(tx.candidate.create).toHaveBeenCalledTimes(1);

      expect(auditService.recordCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateCandidate', () => {
    it('records an UPDATE audit event with distinct before and after payloads', async () => {
      const before: CandidateRecord = {
        id: 'c1',
        name: 'Jane',
        email: 'jane@x.com',
        tenantId: 't1',
        roleAppliedFor: 'Engineer',
      };

      const after: CandidateRecord = {
        ...before,
        name: 'Jane Doe',
      };

      tx.candidate.findFirst.mockResolvedValue(before);

      tx.candidate.update.mockResolvedValue(after);

      const input: UpdateCandidateInput = {
        name: 'Jane Doe',
      };

      const result = await service.updateCandidate('c1', input, user);

      expect(result).toEqual(after);

      expect(auditService.recordUpdate).toHaveBeenCalledTimes(1);

      const call = auditService.recordUpdate.mock.calls[0][1];

      expect(call.tenantId).toBe('t1');
      expect(call.actorId).toBe('u1');
      expect(call.recordType).toBe('Candidate');
      expect(call.recordId).toBe('c1');

      expect(call.before).toEqual(before);
      expect(call.after).toEqual(after);

      expect(call.before).not.toEqual(call.after);
    });

    it('throws NotFoundException and does not record an audit event when candidate is missing', async () => {
      tx.candidate.findFirst.mockResolvedValue(null);

      const input: UpdateCandidateInput = {
        name: 'X',
      };

      await expect(
        service.updateCandidate('missing', input, user),
      ).rejects.toThrow(NotFoundException);

      expect(auditService.recordUpdate).not.toHaveBeenCalled();

      expect(tx.candidate.update).not.toHaveBeenCalled();
    });

    it('throws ConflictException on email collision and does not record an audit event', async () => {
      tx.candidate.findFirst.mockResolvedValue({
        id: 'c1',
        name: 'Jane',
        email: 'jane@x.com',
        tenantId: 't1',
        roleAppliedFor: 'Engineer',
      });

      tx.candidate.findUnique.mockResolvedValue({
        id: 'someone-else',
        name: 'Someone Else',
        email: 'taken@x.com',
        tenantId: 't1',
        roleAppliedFor: 'Engineer',
      });

      const input: UpdateCandidateInput = {
        email: 'taken@x.com',
      };

      await expect(service.updateCandidate('c1', input, user)).rejects.toThrow(
        ConflictException,
      );

      expect(auditService.recordUpdate).not.toHaveBeenCalled();

      expect(tx.candidate.update).not.toHaveBeenCalled();
    });
  });

  describe('getCandidateById', () => {
    it('records a READ audit event when the candidate is found', async () => {
      const candidate: CandidateRecord = {
        id: 'c1',
        name: 'Jane',
        email: 'jane@x.com',
        tenantId: 't1',
        roleAppliedFor: 'Engineer',
      };

      tx.candidate.findFirst.mockResolvedValue(candidate);

      const result = await service.getCandidateById('c1', user);

      expect(result).toEqual(candidate);

      expect(tenantTransaction.execute).toHaveBeenCalledWith(
        't1',
        expect.any(Function),
      );

      expect(auditService.recordRead).toHaveBeenCalledTimes(1);

      expect(auditService.recordRead).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({
          tenantId: 't1',
          actorId: 'u1',
          recordType: 'Candidate',
          recordId: 'c1',
          record: candidate,
        }),
      );
    });

    it('throws NotFoundException and does not record an audit event when candidate is missing', async () => {
      tx.candidate.findFirst.mockResolvedValue(null);

      await expect(service.getCandidateById('missing', user)).rejects.toThrow(
        NotFoundException,
      );

      expect(auditService.recordRead).not.toHaveBeenCalled();
    });
  });
});

// 3. AuditEvent immutability (DB trigger)
describe('AuditEvent immutability (DB trigger)', () => {
  let prisma: PrismaService;

  let tenantId: string;
  let userId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);

    await prisma.$connect();

    const tenant = await prisma.tenant.create({
      data: {
        name: `Audit Test Tenant ${Date.now()}`,
      },
    });

    tenantId = tenant.id;

    const user = await prisma.user.create({
      data: {
        tenantId,
        email: `audit-${Date.now()}@test.com`,
        password: 'test-password',
        name: 'Audit Test User',
        role: 'ADMIN',
      },
    });

    userId = user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const createAuditEvent = async (tx: Prisma.TransactionClient) => {
    return tx.auditEvent.create({
      data: {
        tenantId,
        actorId: userId,
        action: AuditAction.CREATE,
        recordType: 'Candidate',
        recordId: `candidate-${Date.now()}-${Math.random()}`,
        afterHash: 'deadbeef',
      },
    });
  };
  const withTenant = async <T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ) => {
    return prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
      SELECT set_config('app.tenant_id', ${tenantId}, true)
    `;

      return callback(tx);
    });
  };
  it('rejects an UPDATE on an existing audit event', async () => {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
      SELECT set_config('app.tenant_id', ${tenantId}, true)
    `;

      const event = await createAuditEvent(tx);

      await expect(
        tx.auditEvent.update({
          where: {
            id: event.id,
          },
          data: {
            afterHash: 'tampered',
          },
        }),
      ).rejects.toThrow(/immutable/i);
    });
  });

  it('rejects a DELETE on an existing audit event', async () => {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
      SELECT set_config('app.tenant_id', ${tenantId}, true)
    `;

      const event = await createAuditEvent(tx);

      await expect(
        tx.auditEvent.delete({
          where: {
            id: event.id,
          },
        }),
      ).rejects.toThrow(/immutable/i);
    });
  });

  it('leaves the audit event unchanged after a failed UPDATE', async () => {
    // Transaction 1: create the audit event.
    const event = await withTenant((tx) => createAuditEvent(tx));

    // Transaction 2: attempt to tamper with it.
    await expect(
      withTenant((tx) =>
        tx.auditEvent.update({
          where: {
            id: event.id,
          },
          data: {
            afterHash: 'tampered',
          },
        }),
      ),
    ).rejects.toThrow(/immutable/i);

    // Transaction 3: verify the original record is unchanged.
    const unchanged = await withTenant((tx) =>
      tx.auditEvent.findUniqueOrThrow({
        where: {
          id: event.id,
        },
      }),
    );

    expect(unchanged.afterHash).toBe('deadbeef');
  });
});

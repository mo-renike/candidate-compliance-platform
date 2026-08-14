import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { PrismaService } from '../src/prisma/prisma.service.js';
import { TenantTransactionService } from '../src/prisma/tenant-transaction.service.js';

describe('Tenant Isolation (RLS)', () => {
  let prisma: PrismaService;
  let tenantTransaction: TenantTransactionService;

  let tenantA: string;
  let tenantB: string;
  let candidateA: string;
  let candidateB: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService, TenantTransactionService],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);

    tenantTransaction = module.get<TenantTransactionService>(
      TenantTransactionService,
    );

    await prisma.$connect();

    const tenants = await prisma.$transaction(async (tx) => {
      const tenantA = await tx.tenant.create({
        data: {
          name: `RLS Test Tenant A ${Date.now()}`,
        },
      });

      const tenantB = await tx.tenant.create({
        data: {
          name: `RLS Test Tenant B ${Date.now()}`,
        },
      });

      return {
        tenantA,
        tenantB,
      };
    });

    tenantA = tenants.tenantA.id;
    tenantB = tenants.tenantB.id;

    const candidateAResult = await tenantTransaction.execute(
      tenantA,
      async (tx) => {
        return tx.candidate.create({
          data: {
            tenantId: tenantA,
            name: 'Tenant A Candidate',
            email: `candidate-a-${Date.now()}@test.com`,
            roleAppliedFor: 'Software Engineer',
          },
        });
      },
    );

    const candidateBResult = await tenantTransaction.execute(
      tenantB,
      async (tx) => {
        return tx.candidate.create({
          data: {
            tenantId: tenantB,
            name: 'Tenant B Candidate',
            email: `candidate-b-${Date.now()}@test.com`,
            roleAppliedFor: 'Software Engineer',
          },
        });
      },
    );

    candidateA = candidateAResult.id;
    candidateB = candidateBResult.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('allows a tenant to access its own candidates', async () => {
    const candidates = await tenantTransaction.execute(tenantA, async (tx) => {
      return tx.candidate.findMany({
        where: {
          tenantId: tenantA,
        },
      });
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0].id).toBe(candidateA);
  });

  it('blocks a tenant from reading another tenant candidate', async () => {
    const candidate = await tenantTransaction.execute(tenantA, async (tx) => {
      return tx.candidate.findUnique({
        where: {
          id: candidateB,
        },
      });
    });

    expect(candidate).toBeNull();
  });

  it('prevents cross-tenant candidate updates', async () => {
    const result = await tenantTransaction.execute(tenantA, async (tx) => {
      return tx.candidate.updateMany({
        where: {
          id: candidateB,
        },
        data: {
          name: 'ATTACKED',
        },
      });
    });

    expect(result.count).toBe(0);

    const candidate = await tenantTransaction.execute(tenantB, async (tx) => {
      return tx.candidate.findUnique({
        where: {
          id: candidateB,
        },
      });
    });

    expect(candidate?.name).toBe('Tenant B Candidate');
  });

  it('prevents cross-tenant candidate deletion', async () => {
    const result = await tenantTransaction.execute(tenantA, async (tx) => {
      return tx.candidate.deleteMany({
        where: {
          id: candidateB,
        },
      });
    });

    expect(result.count).toBe(0);

    const candidate = await tenantTransaction.execute(tenantB, async (tx) => {
      return tx.candidate.findUnique({
        where: {
          id: candidateB,
        },
      });
    });

    expect(candidate).not.toBeNull();
  });
});

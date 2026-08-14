import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcrypt';
import { PrismaClient } from '../generated/prisma/client.js';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  const password = await hash('Password123!', 12);

  // -------------------------
  // Tenant A
  // -------------------------

  const tenantA = await prisma.tenant.upsert({
    where: {
      id: '11111111-1111-1111-1111-111111111111',
    },
    update: {},
    create: {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Acme Recruitment',
    },
  });

  const adminA = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenantA.id,
        email: 'admin@acme.test',
      },
    },
    update: {},
    create: {
      tenantId: tenantA.id,
      email: 'admin@acme.test',
      password,
      name: 'Acme Admin',
      role: 'ADMIN',
    },
  });

  const recruiterA = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenantA.id,
        email: 'recruiter@acme.test',
      },
    },
    update: {},
    create: {
      tenantId: tenantA.id,
      email: 'recruiter@acme.test',
      password,
      name: 'Acme Recruiter',
      role: 'RECRUITER',
    },
  });

  const candidateA = await prisma.candidate.upsert({
    where: {
      tenantId_email: {
        tenantId: tenantA.id,
        email: 'candidate@acme.test',
      },
    },
    update: {},
    create: {
      tenantId: tenantA.id,
      name: 'Alice Johnson',
      email: 'candidate@acme.test',
      roleAppliedFor: 'Software Engineer',
    },
  });

  // -------------------------
  // Tenant B
  // -------------------------

  const tenantB = await prisma.tenant.upsert({
    where: {
      id: '22222222-2222-2222-2222-222222222222',
    },
    update: {},
    create: {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Global Talent Partners',
    },
  });

  const adminB = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenantB.id,
        email: 'admin@global.test',
      },
    },
    update: {},
    create: {
      tenantId: tenantB.id,
      email: 'admin@global.test',
      password,
      name: 'Global Admin',
      role: 'ADMIN',
    },
  });

  const recruiterB = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenantB.id,
        email: 'recruiter@global.test',
      },
    },
    update: {},
    create: {
      tenantId: tenantB.id,
      email: 'recruiter@global.test',
      password,
      name: 'Global Recruiter',
      role: 'RECRUITER',
    },
  });

  const candidateB = await prisma.candidate.upsert({
    where: {
      tenantId_email: {
        tenantId: tenantB.id,
        email: 'candidate@global.test',
      },
    },
    update: {},
    create: {
      tenantId: tenantB.id,
      name: 'Bob Williams',
      email: 'candidate@global.test',
      roleAppliedFor: 'Product Manager',
    },
  });

  // -------------------------
  // Compliance documents
  // -------------------------

  await prisma.complianceDocument.createMany({
    data: [
      {
        tenantId: tenantA.id,
        candidateId: candidateA.id,
        type: 'RIGHT_TO_WORK',
        issueDate: new Date('2026-01-01'),
        expiryDate: new Date('2026-09-01'),
        status: 'VERIFIED',
      },
      {
        tenantId: tenantB.id,
        candidateId: candidateB.id,
        type: 'PROFESSIONAL_CERTIFICATION',
        issueDate: new Date('2026-02-01'),
        expiryDate: new Date('2026-09-10'),
        status: 'PENDING',
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Database seeded successfully.');
  console.log('');
  console.log('Tenant A:', tenantA.id);
  console.log('  Admin:', adminA.email);
  console.log('  Recruiter:', recruiterA.email);
  console.log('  Candidate:', candidateA.email);
  console.log('');
  console.log('Tenant B:', tenantB.id);
  console.log('  Admin:', adminB.email);
  console.log('  Recruiter:', recruiterB.email);
  console.log('  Candidate:', candidateB.email);
  console.log('');
  console.log('Password for seeded users: Password123!');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

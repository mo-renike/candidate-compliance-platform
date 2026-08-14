import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
    });

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async setTenantContext(tenantId: string): Promise<void> {
    await this.$executeRaw`
      SELECT set_config('app.tenant_id', ${tenantId}, false)
    `;
  }

  async clearTenantContext(): Promise<void> {
    await this.$executeRaw`
      SELECT set_config('app.tenant_id', '', false)
    `;
  }
}

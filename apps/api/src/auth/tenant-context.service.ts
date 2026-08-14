import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';

@Injectable()
export class TenantContextService {
  constructor(private readonly prisma: PrismaService) {}

  async validate(user: AuthenticatedUser) {
    const tenant = await this.prisma.tenant.findUnique({
      where: {
        id: user.tenantId,
      },
    });

    if (!tenant) {
      throw new UnauthorizedException('Invalid tenant context');
    }

    const tenantUser = await this.prisma.user.findFirst({
      where: {
        id: user.id,
        tenantId: tenant.id,
      },
    });

    if (!tenantUser) {
      throw new UnauthorizedException('User does not belong to tenant');
    }

    return tenant;
  }
}

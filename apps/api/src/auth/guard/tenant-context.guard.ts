import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface.js';
import { TenantContextService } from '../tenant-context.service.js';

@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(private readonly tenantContextService: TenantContextService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    const tenant = await this.tenantContextService.validate(user);

    request.tenant = tenant;

    return true;
  }
}

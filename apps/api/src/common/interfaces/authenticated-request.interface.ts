import type { TenantContextService } from '../../auth/tenant-context.service.js';

type Tenant = Awaited<ReturnType<TenantContextService['validate']>>;
export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  role: string;
}

export interface AuthenticatedRequest {
  user?: AuthenticatedUser;
  tenant?: Tenant;
}

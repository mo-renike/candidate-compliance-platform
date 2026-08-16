import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guard/auth.guard.js';
import { PermissionsGuard } from '../auth/guard/permissions.guard.js';
import { TenantContextGuard } from '../auth/guard/tenant-context.guard.js';
import { RequirePermissions } from '../auth/permissions/permissions.decorator.js';
import { Permission } from '../auth/permissions/permissions.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';

import { CreateVerificationDto } from './dto/create-verification.dto.js';
import { VerificationsService } from './verification.service.js';

@Controller('v1/verifications')
@UseGuards(JwtAuthGuard, TenantContextGuard, PermissionsGuard)
export class VerificationsController {
  constructor(private readonly VerificationService: VerificationsService) {}

  @ApiOperation({
    summary: 'Request Right-to-Work verification for a document',
  })
  @Post()
  @RequirePermissions(Permission.CREATE_VERIFICATION)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateVerificationDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.VerificationService.requestVerification(
      user.tenantId,
      user.id,
      dto,
      idempotencyKey,
    );
  }

  @ApiOperation({ summary: 'Get verification status' })
  @Get(':id')
  @RequirePermissions(Permission.READ_VERIFICATION)
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.VerificationService.getVerificationById(
      user.tenantId,
      user.id,
      id,
    );
  }
}

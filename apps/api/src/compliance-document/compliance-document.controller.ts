import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guard/auth.guard.js';
import { PermissionsGuard } from '../auth/guard/permissions.guard.js';
import { TenantContextGuard } from '../auth/guard/tenant-context.guard.js';
import { RequirePermissions } from '../auth/permissions/permissions.decorator.js';
import { Permission } from '../auth/permissions/permissions.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';

import { ComplianceDocumentsService } from './compliance-document.service.js';
import { CreateComplianceDocumentDto } from './dto/create-compliance-document.dto.js';
import { ListComplianceDocumentsDto } from './dto/list-compliance-documents.dto.js';
import { UpdateComplianceDocumentDto } from './dto/update-compliance-document.dto.js';

@Controller('v1/compliance-documents')
@UseGuards(JwtAuthGuard, TenantContextGuard, PermissionsGuard)
export class ComplianceDocumentsController {
  constructor(
    private readonly complianceDocumentsService: ComplianceDocumentsService,
  ) {}

  @ApiOperation({ summary: 'Create a new compliance document' })
  @Post()
  @RequirePermissions(Permission.CREATE_DOCUMENT)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateComplianceDocumentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.complianceDocumentsService.createDocument(
      user.tenantId,
      user.id,
      dto,
      idempotencyKey,
    );
  }

  @ApiOperation({ summary: 'Get all compliance documents' })
  @Get()
  @RequirePermissions(Permission.READ_DOCUMENT)
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListComplianceDocumentsDto,
  ) {
    return this.complianceDocumentsService.getAllDocuments(
      user.tenantId,
      query,
    );
  }

  @ApiOperation({ summary: 'Get expiring soon compliance documents' })
  @Get('expiring')
  @RequirePermissions(Permission.READ_DOCUMENT)
  getExpiringSoon(@CurrentUser() user: AuthenticatedUser) {
    return this.complianceDocumentsService.getExpiringSoon(user.tenantId);
  }

  @ApiOperation({ summary: 'Get a specific compliance document' })
  @Get(':id')
  @RequirePermissions(Permission.READ_DOCUMENT)
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.complianceDocumentsService.getDocumentByID(
      user.tenantId,
      user.id,
      id,
    );
  }

  @ApiOperation({ summary: 'Update a specific compliance document' })
  @Patch(':id')
  @RequirePermissions(Permission.UPDATE_DOCUMENT)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateComplianceDocumentDto,
  ) {
    return this.complianceDocumentsService.updateDocument(
      user.tenantId,
      user.id,
      id,
      dto,
    );
  }

  @ApiOperation({ summary: 'Delete a specific compliance document' })
  @Delete(':id')
  @RequirePermissions(Permission.DELETE_DOCUMENT)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.complianceDocumentsService.deleteDocument(user.tenantId, id);
  }
}

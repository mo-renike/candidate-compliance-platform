import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CandidatesService } from './candidates.service.js';
import { CreateCandidateDto } from './dto/create-candidate.dto.js';
import { UpdateCandidateDto } from './dto/update-candidate.dto.js';
import { ListCandidatesDto } from './dto/list-candidates.dto.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guard/auth.guard.js';
import { PermissionsGuard } from '../auth/guard/permissions.guard.js';
import { TenantContextGuard } from '../auth/guard/tenant-context.guard.js';
import { Permission } from '../auth/permissions/permissions.js';
import { RequirePermissions } from '../auth/permissions/permissions.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';
import { ApiOperation } from '@nestjs/swagger';

@Controller('v1/candidates')
@UseGuards(JwtAuthGuard, TenantContextGuard, PermissionsGuard)
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @ApiOperation({ summary: 'Create a new candidate' })
  @Post()
  @RequirePermissions(Permission.CREATE_CANDIDATE)
  createCandidate(
    @Body() dto: CreateCandidateDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.candidatesService.createCandidate(dto, user);
  }

  @ApiOperation({ summary: 'Get all candidates' })
  @Get()
  @RequirePermissions(Permission.READ_CANDIDATE)
  getAllCandidates(
    @Query() query: ListCandidatesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.candidatesService.getAllCandidates(query, user);
  }

  @ApiOperation({ summary: 'Get a single candidate' })
  @Get(':id')
  @RequirePermissions(Permission.READ_CANDIDATE)
  getOneCandidateById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.candidatesService.getCandidateById(id, user);
  }

  @ApiOperation({ summary: 'Update a candidate ' })
  @Patch(':id')
  @RequirePermissions(Permission.UPDATE_CANDIDATE)
  updateCandidate(
    @Param('id') id: string,
    @Body() dto: UpdateCandidateDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.candidatesService.updateCandidate(id, dto, user);
  }
}

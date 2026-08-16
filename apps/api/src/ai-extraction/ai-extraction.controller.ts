import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guard/auth.guard.js';
import { PermissionsGuard } from '../auth/guard/permissions.guard.js';
import { TenantContextGuard } from '../auth/guard/tenant-context.guard.js';
import { RequirePermissions } from '../auth/permissions/permissions.decorator.js';
import { Permission } from '../auth/permissions/permissions.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';
import { AiCvExtractionService } from './ai-cv-extraction.service.js';
import { CreateCvExtractionDto } from './dto/create-cv-extraction.dto.js';
import { ConfirmExtractionDto } from './dto/confirm-ai-extraction.dto.js';

@Controller('v1/ai/cv-extractions')
@UseGuards(JwtAuthGuard, TenantContextGuard, PermissionsGuard)
export class AiCvExtractionController {
  constructor(private readonly service: AiCvExtractionService) {}

  @ApiOperation({ summary: 'Upload a CV and propose structured extraction' })
  @ApiConsumes('multipart/form-data')
  @Post()
  @RequirePermissions(Permission.CREATE_AI_EXTRACTION)
  @UseInterceptors(FileInterceptor('file'))
  create(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateCvExtractionDto,
  ) {
    return this.service.createExtraction(
      user.tenantId,
      user.id,
      file,
      dto.purpose,
      dto.candidateId,
    );
  }

  @ApiOperation({ summary: 'Get a proposed AI extraction' })
  @Get(':id')
  @RequirePermissions(Permission.READ_AI_EXTRACTION)
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getExtractionById(user.tenantId, user.id, id);
  }

  @ApiOperation({
    summary: 'Recruiter confirms or rejects a proposed extraction',
  })
  @Patch(':id/confirm')
  @RequirePermissions(Permission.CONFIRM_AI_EXTRACTION)
  confirm(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ConfirmExtractionDto,
  ) {
    return this.service.confirmExtraction(user.tenantId, user.id, id, dto);
  }
}

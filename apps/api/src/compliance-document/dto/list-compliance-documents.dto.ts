import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  ComplianceDocumentType,
  DocumentStatus,
} from '../../../generated/prisma/browser.js';

export class ListComplianceDocumentsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsString()
  candidateId?: string;

  @IsOptional()
  @IsString()
  type?: ComplianceDocumentType;

  @IsOptional()
  @IsString()
  status?: DocumentStatus;
}

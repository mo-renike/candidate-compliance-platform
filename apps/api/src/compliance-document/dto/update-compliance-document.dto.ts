import { PartialType } from '@nestjs/swagger';
import { CreateComplianceDocumentDto } from './create-compliance-document.dto.js';

export class UpdateComplianceDocumentDto extends PartialType(
  CreateComplianceDocumentDto,
) {}

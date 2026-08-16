import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

class ExtractionOverridesDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) skills?: string[];
  @IsOptional() @IsInt() @Min(0) yearsOfExperience?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) certifications?: string[];
}

export class ConfirmExtractionDto {
  @IsIn(['accept', 'reject'])
  decision!: 'accept' | 'reject';

  @IsOptional()
  @IsUUID()
  candidateId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ExtractionOverridesDto)
  overrides?: ExtractionOverridesDto;
}

import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCvExtractionDto {
  @IsOptional()
  @IsUUID()
  candidateId?: string;

  @IsString()
  purpose!: string;
}

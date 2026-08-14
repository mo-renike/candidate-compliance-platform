import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCandidateDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  roleAppliedFor?: string;
}

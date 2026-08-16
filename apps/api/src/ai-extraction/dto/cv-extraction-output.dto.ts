import { IsArray, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CvExtractionOutputDto {
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsArray()
  @IsString({ each: true })
  skills!: string[];

  @IsInt()
  @Min(0)
  yearsOfExperience!: number;

  @IsArray()
  @IsString({ each: true })
  certifications!: string[];
}

import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateVerificationDto {
  @IsUUID()
  @IsNotEmpty()
  documentId!: string;
}

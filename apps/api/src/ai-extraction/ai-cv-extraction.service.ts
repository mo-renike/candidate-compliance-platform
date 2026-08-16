import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuditService } from '../audit/audit.service.js';
import { TenantTransactionService } from '../prisma/tenant-transaction.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CvTextExtractorService } from './cv-text-extractor.service.js';
import {
  CV_EXTRACTION_PROVIDER,
  type CvExtractionProvider,
} from './providers/cv-extractor.interface.js';
import { ConfirmExtractionDto } from './dto/confirm-ai-extraction.dto.js';
import { CvExtractionOutputDto } from './dto/cv-extraction-output.dto.ts.js';

@Injectable()
export class AiCvExtractionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantTransaction: TenantTransactionService,
    private readonly auditService: AuditService,
    private readonly textExtractor: CvTextExtractorService,
    @Inject(CV_EXTRACTION_PROVIDER)
    private readonly extractor: CvExtractionProvider,
  ) {}

  async createExtraction(
    tenantId: string,
    actorId: string,
    file: Express.Multer.File,
    purpose: string,
    candidateId?: string,
  ) {
    if (candidateId) {
      const candidate = await this.prisma.candidate.findFirst({
        where: { id: candidateId, tenantId },
      });

      if (!candidate) {
        throw new NotFoundException('Candidate not found');
      }
    }

    const text = await this.textExtractor.extractText(file);

    if (!text.trim()) {
      throw new BadRequestException(
        'Could not read any text from the uploaded CV',
      );
    }

    const rawOutput = this.extractor.extract(text);

    const validated = plainToInstance(CvExtractionOutputDto, rawOutput);
    const errors = await validate(validated);

    if (errors.length > 0) {
      throw new UnprocessableEntityException(
        'AI extraction output failed schema validation',
      );
    }

    return this.tenantTransaction.execute(tenantId, async (tx) => {
      const extraction = await tx.aIExtraction.create({
        data: {
          tenantId,
          actorId,
          candidateId: candidateId ?? null,
          purpose,
          model: this.extractor.modelName,
          inputHash: this.auditService.hash(text),
          output: { ...validated },
          status: 'PROPOSED',
        },
      });

      await this.auditService.recordCreate(tx, {
        tenantId,
        actorId,
        recordType: 'AIExtraction',
        recordId: extraction.id,
        after: extraction,
      });

      return extraction;
    });
  }

  async getExtractionById(tenantId: string, actorId: string, id: string) {
    return this.tenantTransaction.execute(tenantId, async (tx) => {
      const extraction = await tx.aIExtraction.findFirst({
        where: { id, tenantId },
      });

      if (!extraction) {
        throw new NotFoundException('AI extraction not found');
      }

      await this.auditService.recordRead(tx, {
        tenantId,
        actorId,
        recordType: 'AIExtraction',
        recordId: extraction.id,
        record: extraction,
      });

      return extraction;
    });
  }

  async confirmExtraction(
    tenantId: string,
    actorId: string,
    id: string,
    dto: ConfirmExtractionDto,
  ) {
    return this.tenantTransaction.execute(tenantId, async (tx) => {
      const extraction = await tx.aIExtraction.findFirst({
        where: { id, tenantId },
      });

      if (!extraction) {
        throw new NotFoundException('AI extraction not found');
      }

      if (extraction.status !== 'PROPOSED') {
        throw new ConflictException(
          `Extraction has already been ${extraction.status.toLowerCase()}`,
        );
      }

      if (dto.decision === 'reject') {
        const updated = await tx.aIExtraction.update({
          where: { id: extraction.id },
          data: { status: 'REJECTED', reviewedAt: new Date() },
        });

        await this.auditService.recordUpdate(tx, {
          tenantId,
          actorId,
          recordType: 'AIExtraction',
          recordId: extraction.id,
          before: extraction,
          after: updated,
        });

        return updated;
      }

      const candidateId = dto.candidateId ?? extraction.candidateId;

      if (!candidateId) {
        throw new BadRequestException(
          'candidateId is required to accept an extraction that was not created against a candidate',
        );
      }

      const candidate = await tx.candidate.findFirst({
        where: { id: candidateId, tenantId },
      });

      if (!candidate) {
        throw new NotFoundException('Candidate not found');
      }

      const merged = plainToInstance(CvExtractionOutputDto, {
        ...(extraction.output as Record<string, unknown>),
        ...dto.overrides,
      });

      const editErrors = await validate(merged);

      if (editErrors.length > 0) {
        throw new UnprocessableEntityException(
          'Edited extraction data failed schema validation',
        );
      }

      const updatedCandidate = await tx.candidate.update({
        where: { id: candidate.id },
        data: { name: merged.fullName },
      });

      const updatedExtraction = await tx.aIExtraction.update({
        where: { id: extraction.id },
        data: {
          candidateId: candidate.id,
          output: { ...merged },
          status: 'ACCEPTED',
          reviewedAt: new Date(),
        },
      });

      await this.auditService.recordUpdate(tx, {
        tenantId,
        actorId,
        recordType: 'Candidate',
        recordId: candidate.id,
        before: candidate,
        after: updatedCandidate,
      });

      await this.auditService.recordUpdate(tx, {
        tenantId,
        actorId,
        recordType: 'AIExtraction',
        recordId: extraction.id,
        before: extraction,
        after: updatedExtraction,
      });

      return updatedExtraction;
    });
  }
}

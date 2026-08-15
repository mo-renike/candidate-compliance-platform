import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCandidateDto } from './dto/create-candidate.dto.js';
import { UpdateCandidateDto } from './dto/update-candidate.dto.js';
import { ListCandidatesDto } from './dto/list-candidates.dto.js';
import { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface.js';
import { TenantTransactionService } from '../prisma/tenant-transaction.service.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class CandidatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantTransaction: TenantTransactionService,
    private readonly auditService: AuditService,
  ) {}

  async createCandidate(dto: CreateCandidateDto, user: AuthenticatedUser) {
    const existing = await this.prisma.candidate.findUnique({
      where: {
        tenantId_email: {
          tenantId: user.tenantId,
          email: dto.email,
        },
      },
    });

    if (existing) {
      throw new ConflictException('A candidate with this email already exists');
    }

    return this.tenantTransaction.execute(user.tenantId, async (tx) => {
      const candidate = await tx.candidate.create({
        data: {
          tenantId: user.tenantId,
          name: dto.name,
          email: dto.email,
          roleAppliedFor: dto.roleAppliedFor,
        },
      });

      await this.auditService.recordCreate(tx, {
        tenantId: user.tenantId,
        actorId: user.id,
        recordType: 'Candidate',
        recordId: candidate.id,
        after: candidate,
      });

      return candidate;
    });
  }

  async updateCandidate(
    id: string,
    dto: UpdateCandidateDto,
    user: AuthenticatedUser,
  ) {
    return this.tenantTransaction.execute(user.tenantId, async (tx) => {
      const candidate = await tx.candidate.findFirst({
        where: {
          id,
          tenantId: user.tenantId,
        },
      });

      if (!candidate) {
        throw new NotFoundException('Candidate not found');
      }

      if (dto.email && dto.email !== candidate.email) {
        const existing = await tx.candidate.findUnique({
          where: {
            tenantId_email: {
              tenantId: user.tenantId,
              email: dto.email,
            },
          },
        });

        if (existing) {
          throw new ConflictException(
            'A candidate with this email already exists',
          );
        }
      }

      const updated = await tx.candidate.update({
        where: {
          id: candidate.id,
        },
        data: dto,
      });

      await this.auditService.recordUpdate(tx, {
        tenantId: user.tenantId,
        actorId: user.id,
        recordType: 'Candidate',
        recordId: candidate.id,
        before: candidate,
        after: updated,
      });

      return updated;
    });
  }

  async getAllCandidates(query: ListCandidatesDto, user: AuthenticatedUser) {
    const { page = 1, limit = 20, search, roleAppliedFor } = query;

    const where = {
      tenantId: user.tenantId,

      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                email: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),

      ...(roleAppliedFor
        ? {
            roleAppliedFor: {
              equals: roleAppliedFor,
              mode: 'insensitive' as const,
            },
          }
        : {}),
    };

    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.candidate.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),

      this.prisma.candidate.count({
        where,
      }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCandidateById(id: string, user: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const candidate = await tx.candidate.findFirst({
        where: {
          id,
          tenantId: user.tenantId,
        },
        include: {
          complianceDocuments: true,
        },
      });

      if (!candidate) {
        throw new NotFoundException('Candidate not found');
      }

      await this.auditService.recordRead(tx, {
        tenantId: user.tenantId,
        actorId: user.id,
        recordType: 'Candidate',
        recordId: candidate.id,
        record: candidate,
      });

      return candidate;
    });
  }
}

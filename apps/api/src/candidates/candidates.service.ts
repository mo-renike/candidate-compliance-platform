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

@Injectable()
export class CandidatesService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.candidate.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name,
        email: dto.email,
        roleAppliedFor: dto.roleAppliedFor,
      },
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
    const candidate = await this.prisma.candidate.findFirst({
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

    return candidate;
  }

  async updateCandidate(
    id: string,
    dto: UpdateCandidateDto,
    user: AuthenticatedUser,
  ) {
    const candidate = await this.prisma.candidate.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
      },
    });

    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    if (dto.email && dto.email !== candidate.email) {
      const existing = await this.prisma.candidate.findUnique({
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

    return this.prisma.candidate.update({
      where: {
        id: candidate.id,
      },
      data: dto,
    });
  }
}

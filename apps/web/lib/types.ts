export type UserRole = "ADMIN" | "RECRUITER" | "COMPLIANCE_MANAGER";

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface Candidate {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  roleAppliedFor: string;
  createdAt: string;
  updatedAt: string;
}

export interface CandidatesResponse {
  data: Candidate[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateCandidateInput {
  name: string;
  email: string;
  roleAppliedFor: string;
}

export type AIExtractionStatus = "PROPOSED" | "ACCEPTED" | "REJECTED";

export interface AIExtraction {
  id: string;
  tenantId: string;
  actorId: string;
  candidateId: string | null;
  purpose: string;
  model: string;
  inputHash: string;
  output: {
    fullName: string;
    skills: string[];
    yearsOfExperience: number;
    certifications: string[];
  };
  status: AIExtractionStatus;
  createdAt: string;
  reviewedAt: string | null;
}

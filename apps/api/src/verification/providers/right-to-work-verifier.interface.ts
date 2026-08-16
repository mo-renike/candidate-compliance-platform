export interface VerificationResult {
  status: 'VERIFIED' | 'FAILED';
  reason?: string;
}

export interface RightToWorkVerifier {
  verify(input: {
    documentId: string;
    documentType: string;
    expiryDate: Date | null;
  }): Promise<VerificationResult>;
}

export const RIGHT_TO_WORK_VERIFIER = Symbol('RIGHT_TO_WORK_VERIFIER');

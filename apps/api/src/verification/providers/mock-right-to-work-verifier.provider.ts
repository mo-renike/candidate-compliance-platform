import { Injectable } from '@nestjs/common';
import {
  RightToWorkVerifier,
  VerificationResult,
} from './right-to-work-verifier.interface.js';

@Injectable()
export class MockRightToWorkVerifier implements RightToWorkVerifier {
  async verify(input: {
    documentId: string;
    documentType: string;
    expiryDate: Date | null;
  }): Promise<VerificationResult> {
    await new Promise((resolve) => setTimeout(resolve, 0));

    if (input.expiryDate && input.expiryDate.getTime() < Date.now()) {
      return { status: 'FAILED', reason: 'Document has already expired' };
    }

    return { status: 'VERIFIED' };
  }
}

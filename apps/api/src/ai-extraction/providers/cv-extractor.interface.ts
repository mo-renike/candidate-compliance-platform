export interface CvExtractionResult {
  fullName: string;
  skills: string[];
  email?: string;
  yearsOfExperience: number;
  certifications: string[];
}

export interface CvExtractionProvider {
  readonly modelName: string;
  extract(text: string): CvExtractionResult;
}

export const CV_EXTRACTION_PROVIDER = Symbol('CV_EXTRACTION_PROVIDER');

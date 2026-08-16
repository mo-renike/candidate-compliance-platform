import { Injectable } from '@nestjs/common';
import {
  CvExtractionProvider,
  CvExtractionResult,
} from './cv-extractor.interface.js';

@Injectable()
export class MockCvExtractionProvider implements CvExtractionProvider {
  readonly modelName = 'mock-heuristic-v1';

  extract(text: string): CvExtractionResult {
    const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);

    const yearsMatch = text.match(
      /(\d+(?:\.\d+)?)\+?\s+years?\s+(?:of\s+)?experience/i,
    );

    const certifications: string[] = [];

    const certificationPatterns = [
      /AWS Certified[^\n,]*/i,
      /Microsoft Certified[^\n,]*/i,
      /Google Cloud Certified[^\n,]*/i,
      /Certified Scrum Master[^\n,]*/i,
      /Professional Scrum Master[^\n,]*/i,
      /Cisco Certified[^\n,]*/i,
    ];

    for (const pattern of certificationPatterns) {
      const match = text.match(pattern);

      if (match) {
        certifications.push(match[0].trim());
      }
    }

    const knownSkills = [
      'JavaScript',
      'TypeScript',
      'React',
      'Next.js',
      'Node.js',
      'NestJS',
      'Python',
      'Java',
      'PostgreSQL',
      'MongoDB',
      'AWS',
      'Docker',
      'Kubernetes',
      'Git',
      'REST APIs',
      'GraphQL',
    ];

    const lowerText = text.toLowerCase();

    const skills = knownSkills.filter((skill) =>
      lowerText.includes(skill.toLowerCase()),
    );

    const firstNameLine = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(
        (line) =>
          line.length > 2 &&
          !line.includes('@') &&
          !line.match(/^https?:\/\//i),
      );

    return {
      fullName: firstNameLine ?? 'Unknown Candidate',
      email: emailMatch?.[0],
      skills,
      yearsOfExperience: yearsMatch ? Number(yearsMatch[1]) : 0,
      certifications,
    };
  }
}

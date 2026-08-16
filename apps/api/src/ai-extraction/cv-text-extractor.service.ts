import { Injectable, UnsupportedMediaTypeException } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';

@Injectable()
export class CvTextExtractorService {
  async extractText(file: Express.Multer.File): Promise<string> {
    if (file.mimetype === 'text/plain') {
      return file.buffer.toString('utf-8');
    }

    if (file.mimetype === 'application/pdf') {
      const parser = new PDFParse({
        data: file.buffer,
      });

      try {
        const result = await parser.getText();

        return result.text;
      } finally {
        await parser.destroy();
      }
    }

    throw new UnsupportedMediaTypeException(
      'Only PDF and plain text CVs are supported',
    );
  }
}

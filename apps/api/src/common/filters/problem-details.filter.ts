import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  timestamp: string;
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Internal Server Error';
    let detail = 'An unexpected error occurred.';
    let type = 'https://httpstatuses.com/500';

    if (exception instanceof HttpException) {
      status = exception.getStatus();

      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        detail = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const body = exceptionResponse as {
          message?: string | string[];
          error?: string;
        };

        if (Array.isArray(body.message)) {
          detail = body.message.join('; ');
        } else if (body.message) {
          detail = body.message;
        }

        title = body.error ?? exception.name;
      }

      type = `https://httpstatuses.com/${status}`;
    }

    const problem: ProblemDetails = {
      type,
      title,
      status,
      detail,
      instance: request.originalUrl,
      timestamp: new Date().toISOString(),
    };

    response
      .status(status)
      .header('Content-Type', 'application/problem+json')
      .json(problem);
  }
}

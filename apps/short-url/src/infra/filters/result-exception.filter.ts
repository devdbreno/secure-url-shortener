import type { FastifyReply } from 'fastify';
import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';

import { Result } from '@application/result';

@Catch(Result)
export class ResultExceptionFilter<T> implements ExceptionFilter {
  catch(exception: Result<T>, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    const error = exception.error;

    response.status(error.status).send({
      status: 'error',
      message: error.message,
    });
  }
}

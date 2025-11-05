import { Catch, ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaNotFoundExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError & { meta?: any }, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    // Prisma "Record not found" error code eh "P2025"
    if (exception.code === 'P2025') {
      const model = exception.meta?.modelName ?? 'Registro';

      response.status(404).json({
        statusCode: 404,
        error: 'Not Found',
        message: `${model} não encontrado`,
      });
    } else {
      // se nao for um erro de nao encontrado, relance
      throw exception;
    }
  }
}
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { AppModule } from './presentation/app.module';
import { ResultExceptionFilter } from './infra/filters/result-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  const configService = app.get(ConfigService);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Short URL')
    .setDescription('API para encurtamento de URLs')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('api-docs', app, document);

  app.useGlobalFilters(new ResultExceptionFilter());

  await app.listen({
    host: '0.0.0.0',
    port: configService.getOrThrow<number>('api.PORT_SHORT_URL'),
  });
}

void bootstrap();

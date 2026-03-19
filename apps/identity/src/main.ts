import 'reflect-metadata';

import { Transport } from '@nestjs/microservices';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

import { AppModule } from '@presentation/app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  const configService = app.get(ConfigService);

  const config = new DocumentBuilder()
    .setTitle('Identity Service')
    .setDescription('Authentication microservice')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api-docs', app, document);

  const _microservice = app.connectMicroservice({
    options: {
      host: '0.0.0.0',
      port: configService.getOrThrow<number>('api.PORT_IDENTITY_TCP'),
    },
    transport: Transport.TCP,
  });

  await app.startAllMicroservices();
  await app.listen({
    host: '0.0.0.0',
    port: configService.getOrThrow<number>('api.PORT_IDENTITY'),
  });
}

void bootstrap();

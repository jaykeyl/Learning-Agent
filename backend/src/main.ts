import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DomainErrorFilter } from 'src/core/prisma/http/domain-error.filter';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configurar límites para archivos grandes
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new DomainErrorFilter()); // Handle DomainError globally,(en el futuro el dominio lanza DomainErrors)

  app.enableShutdownHooks();

  app.enableCors();

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

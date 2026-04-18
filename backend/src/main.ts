import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const corsOrigin = configService.get('corsOrigin') || [];
  if (corsOrigin.length === 0) {
    console.warn('WARNING: CORS_ORIGIN is not set. All origins will be allowed. Set CORS_ORIGIN in production.');
  }
  app.enableCors({
    origin: corsOrigin.length > 0 ? corsOrigin : true,
  });

  const port = configService.get('port') || 5005;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

void bootstrap();
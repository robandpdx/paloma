import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { EnvironmentService } from './config/environment.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const environment = app.get(EnvironmentService);

  app.setGlobalPrefix('api');
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const corsOrigin = environment.corsOrigin;
  if (corsOrigin.length === 0) {
    console.warn('WARNING: CORS_ORIGIN is not set. All origins will be allowed. Set CORS_ORIGIN in production.');
  }
  app.enableCors({
    origin: corsOrigin.length > 0 ? corsOrigin : true,
  });

  await app.listen(environment.port);
}

void bootstrap();
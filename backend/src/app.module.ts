import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppEnvironment } from './config/env.validation';
import { EnvironmentService } from './config/environment.service';
import { validateEnvironment } from './config/env.validation';
import { GitHubModule } from './github/github.module';
import { RepositoryMigrationsModule } from './repository-migrations/repository-migrations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnvironment,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppEnvironment, true>) => ({
        uri: configService.get('mongoUri', { infer: true }),
      }),
    }),
    GitHubModule,
    RepositoryMigrationsModule,
  ],
  controllers: [AppController],
  providers: [EnvironmentService],
})
export class AppModule {}
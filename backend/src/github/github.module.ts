import { Module } from '@nestjs/common';
import { EnvironmentService } from '../config/environment.service';
import { GitHubController } from './github.controller';
import { MigrationService } from './migration.service';
import { ExportService } from './export.service';
import { SourceRepositoryService } from './source-repository.service';
import { RepositoryMigrationsModule } from '../repository-migrations/repository-migrations.module';

@Module({
  imports: [RepositoryMigrationsModule],
  controllers: [GitHubController],
  providers: [MigrationService, ExportService, SourceRepositoryService, EnvironmentService],
  exports: [MigrationService, ExportService, SourceRepositoryService],
})
export class GitHubModule {}
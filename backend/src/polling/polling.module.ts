import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { MigrationStatusGateway } from '../websocket/migration-status.gateway';
import { PollingService } from './polling.service';
import { RepositoryMigration, RepositoryMigrationSchema } from '../repository-migrations/schemas/repository-migration.schema';
import { GitHubModule } from '../github/github.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: RepositoryMigration.name, schema: RepositoryMigrationSchema },
    ]),
    GitHubModule,
  ],
  providers: [MigrationStatusGateway, PollingService],
  exports: [MigrationStatusGateway, PollingService],
})
export class PollingModule {}
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EnvironmentService } from '../config/environment.service';
import {
  RepositoryMigration,
  RepositoryMigrationSchema,
} from './schemas/repository-migration.schema';
import { RepositoryMigrationsController } from './repository-migrations.controller';
import { RepositoryMigrationsService } from './repository-migrations.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: RepositoryMigration.name,
        schema: RepositoryMigrationSchema,
      },
    ]),
  ],
  controllers: [RepositoryMigrationsController],
  providers: [RepositoryMigrationsService, EnvironmentService],
  exports: [RepositoryMigrationsService],
})
export class RepositoryMigrationsModule {}
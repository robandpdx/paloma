import { PartialType } from '@nestjs/mapped-types';
import { CreateRepositoryMigrationDto } from './create-repository-migration.dto';

export class UpdateRepositoryMigrationDto extends PartialType(CreateRepositoryMigrationDto) {}
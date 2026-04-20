import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import {
  MIGRATION_STATES,
  type MigrationState,
  REPO_VISIBILITIES,
  type RepoVisibility,
} from '../../common/constants/migration-states';

export class CreateRepositoryMigrationDto {
  @IsString()
  repositoryName!: string;

  @IsUrl({ require_tld: false })
  sourceRepositoryUrl!: string;

  @IsOptional()
  @IsString()
  destinationOwnerId?: string;

  @IsOptional()
  @IsString()
  migrationSourceId?: string;

  @IsOptional()
  @IsString()
  repositoryMigrationId?: string;

  @IsOptional()
  @IsIn([...MIGRATION_STATES])
  state?: MigrationState;

  @IsOptional()
  @IsString()
  failureReason?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  lockSource?: boolean;

  @IsOptional()
  @IsIn([...REPO_VISIBILITIES])
  repositoryVisibility?: RepoVisibility;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  archived?: boolean;

  @IsOptional()
  @IsString()
  gitSourceExportId?: string;

  @IsOptional()
  @IsString()
  metadataExportId?: string;

  @IsOptional()
  @IsString()
  gitSourceExportState?: string;

  @IsOptional()
  @IsString()
  metadataExportState?: string;

  @IsOptional()
  @IsString()
  gitSourceArchiveUrl?: string;

  @IsOptional()
  @IsString()
  metadataArchiveUrl?: string;

  @IsOptional()
  @IsString()
  exportFailureReason?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPolling?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  exportPolling?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  migrationPolling?: boolean;
}
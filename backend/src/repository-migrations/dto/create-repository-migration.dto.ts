import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

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
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  failureReason?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  lockSource?: boolean;

  @IsOptional()
  @IsIn(['private', 'public', 'internal'])
  repositoryVisibility?: 'private' | 'public' | 'internal';

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
}
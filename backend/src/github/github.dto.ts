import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class StartMigrationDto {
  @IsUrl({ require_tld: false })
  sourceRepositoryUrl!: string;

  @IsString()
  repositoryName!: string;

  @IsOptional()
  @IsIn(['private', 'public', 'internal'])
  targetRepoVisibility?: 'private' | 'public' | 'internal';

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  continueOnError?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  lockSource?: boolean;

  @IsOptional()
  @IsString()
  destinationOwnerId?: string;

  @IsOptional()
  @IsString()
  gitSourceArchiveUrl?: string;

  @IsOptional()
  @IsString()
  metadataArchiveUrl?: string;
}

export class UnlockSourceRepoDto {
  @IsUrl({ require_tld: false })
  sourceRepositoryUrl!: string;

  @IsString()
  migrationSourceId!: string;

  @IsString()
  repositoryName!: string;
}

export class ScanSourceOrgDto {
  @IsString()
  organizationName!: string;
}

export class StartExportDto {
  @IsString()
  organizationName!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  repositoryNames!: string[];

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  lockSource?: boolean;
}
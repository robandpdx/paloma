import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import {
  ScanSourceOrgDto,
  StartExportDto,
  StartMigrationDto,
  UnlockSourceRepoDto,
} from './github.dto';
import { MigrationService } from './migration.service';
import { ExportService } from './export.service';
import { SourceRepositoryService } from './source-repository.service';

@Controller('github')
export class GitHubController {
  constructor(
    private readonly migrationService: MigrationService,
    private readonly exportService: ExportService,
    private readonly sourceRepositoryService: SourceRepositoryService,
  ) {}

  @Get('owner')
  getOwnerId() {
    return this.migrationService.getOwnerId();
  }

  @Post('migrations')
  startMigration(@Body() payload: StartMigrationDto) {
    return this.migrationService.startMigration(payload);
  }

  @Get('migrations/:migrationId')
  getMigrationStatus(@Param('migrationId') migrationId: string) {
    return this.migrationService.getMigrationStatus(migrationId);
  }

  @Delete('target-repositories/:repositoryName')
  deleteTargetRepository(@Param('repositoryName') repositoryName: string) {
    return this.migrationService.deleteTargetRepository(repositoryName);
  }

  @Post('source-repositories/unlock')
  unlockSourceRepository(@Body() payload: UnlockSourceRepoDto) {
    return this.sourceRepositoryService.unlockSourceRepository(payload);
  }

  @Post('source-organizations/scan')
  scanSourceOrganization(@Body() payload: ScanSourceOrgDto) {
    return this.sourceRepositoryService.scanSourceOrganization(payload);
  }

  @Post('exports')
  startExport(@Body() payload: StartExportDto) {
    return this.exportService.startExport(payload);
  }

  @Get('exports/:organizationName/:exportId')
  getExportStatus(
    @Param('organizationName') organizationName: string,
    @Param('exportId') exportId: string,
  ) {
    return this.exportService.getExportStatus(organizationName, exportId);
  }
}
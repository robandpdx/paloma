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
import { GitHubService } from './github.service';

@Controller('github')
export class GitHubController {
  constructor(private readonly githubService: GitHubService) {}

  @Get('owner')
  getOwnerId() {
    return this.githubService.getOwnerId();
  }

  @Post('migrations')
  startMigration(@Body() payload: StartMigrationDto) {
    return this.githubService.startMigration(payload);
  }

  @Get('migrations/:migrationId')
  getMigrationStatus(@Param('migrationId') migrationId: string) {
    return this.githubService.getMigrationStatus(migrationId);
  }

  @Delete('target-repositories/:repositoryName')
  deleteTargetRepository(@Param('repositoryName') repositoryName: string) {
    return this.githubService.deleteTargetRepository(repositoryName);
  }

  @Post('source-repositories/unlock')
  unlockSourceRepository(@Body() payload: UnlockSourceRepoDto) {
    return this.githubService.unlockSourceRepository(payload);
  }

  @Post('source-organizations/scan')
  scanSourceOrganization(@Body() payload: ScanSourceOrgDto) {
    return this.githubService.scanSourceOrganization(payload);
  }

  @Post('exports')
  startExport(@Body() payload: StartExportDto) {
    return this.githubService.startExport(payload);
  }

  @Get('exports/:organizationName/:exportId')
  getExportStatus(
    @Param('organizationName') organizationName: string,
    @Param('exportId') exportId: string,
  ) {
    return this.githubService.getExportStatus(organizationName, exportId);
  }
}
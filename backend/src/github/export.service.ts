import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { GitHubBaseService } from './github-base.service';
import { ExportResponse, ExportStatusResponse } from './github.types';
import { StartExportDto } from './github.dto';

@Injectable()
export class ExportService extends GitHubBaseService {
  async startExport(payload: StartExportDto) {
    if (this.environment.mode !== 'GHES') {
      throw new BadRequestException('startExport is only available when MODE is GHES');
    }

    const sourceToken = this.requireSourceAdminToken();

    const [gitSourceExport, metadataExport] = await Promise.all([
      this.makeGhesRequest<ExportResponse>('POST', `/orgs/${payload.organizationName}/migrations`, sourceToken, {
        repositories: payload.repositoryNames,
        exclude_metadata: false,
        exclude_git_data: false,
        exclude_attachments: true,
        exclude_releases: true,
        exclude_owner_projects: true,
      }),
      this.makeGhesRequest<ExportResponse>('POST', `/orgs/${payload.organizationName}/migrations`, sourceToken, {
        repositories: payload.repositoryNames,
        lock_repositories: payload.lockSource ?? false,
        exclude_metadata: false,
        exclude_git_data: true,
        exclude_attachments: true,
        exclude_releases: true,
        exclude_owner_projects: true,
      }),
    ]);

    return {
      success: true,
      message: 'GHES exports started successfully',
      gitSourceExportId: gitSourceExport.id,
      metadataExportId: metadataExport.id,
      gitSourceExportState: gitSourceExport.state,
      metadataExportState: metadataExport.state,
    };
  }

  async getExportStatus(organizationName: string, exportId: string) {
    if (this.environment.mode !== 'GHES') {
      throw new BadRequestException('checkExportStatus is only available when MODE is GHES');
    }

    const sourceToken = this.requireSourceAdminToken();
    const status = await this.makeGhesRequest<ExportStatusResponse>(
      'GET',
      `/orgs/${organizationName}/migrations/${exportId}`,
      sourceToken,
    );

    let archiveUrl: string | undefined;
    if (status.state === 'exported') {
      const archiveResponse = await fetch(
        `${this.requireGhesApiUrl()}/orgs/${organizationName}/migrations/${exportId}/archive`,
        {
          method: 'GET',
          headers: this.buildRestHeaders(sourceToken),
          redirect: 'manual',
        },
      );

      if (archiveResponse.status === 302) {
        archiveUrl = archiveResponse.headers.get('Location') ?? undefined;
      }
    }

    return {
      success: true,
      exportId: status.id,
      state: status.state,
      createdAt: status.created_at,
      updatedAt: status.updated_at,
      archiveUrl,
    };
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RepositoryMigration, RepositoryMigrationDocument } from '../repository-migrations/schemas/repository-migration.schema';
import { MigrationService } from '../github/migration.service';
import { ExportService } from '../github/export.service';
import { MigrationStatusGateway } from '../websocket/migration-status.gateway';

@Injectable()
export class PollingService implements OnModuleInit {
  private readonly logger = new Logger(PollingService.name);
  
  // Mutex flags to prevent overlapping polling cycles
  private isMigrationPollingActive = false;
  private isExportPollingActive = false;

  constructor(
    @InjectModel(RepositoryMigration.name)
    private readonly repositoryMigrationModel: Model<RepositoryMigrationDocument>,
    private readonly migrationService: MigrationService,
    private readonly exportService: ExportService,
    private readonly migrationStatusGateway: MigrationStatusGateway,
  ) {}

  onModuleInit() {
    this.logger.log('PollingService initialized - starting initial polling check...');
    
    // Start polling immediately for any existing active migrations/exports
    setTimeout(() => {
      this.pollActiveMigrations();
      this.pollActiveExports();
    }, 2000); // Give a small delay for the app to fully start up
  }

  @Cron('*/30 * * * * *') // Every 30 seconds
  async pollActiveMigrations() {
    // Skip if previous cycle is still running
    if (this.isMigrationPollingActive) {
      this.logger.debug('Skipping migration polling cycle - previous cycle still in progress');
      return;
    }

    this.isMigrationPollingActive = true;
    this.logger.debug('Starting migration status polling cycle');
    
    try {
      // Find all repositories with active migrations
      const activeMigrations = await this.repositoryMigrationModel.find({
        repositoryMigrationId: { $exists: true, $ne: null },
        state: { $in: ['queued', 'in_progress'] },
        migrationPolling: { $ne: false }, // Poll unless explicitly disabled
      });

      this.logger.debug(`Found ${activeMigrations.length} active migrations to poll`);

      for (const migration of activeMigrations) {
        await this.checkMigrationStatus(migration);
      }
    } catch (error) {
      this.logger.error('Error during migration polling cycle:', error);
    } finally {
      this.isMigrationPollingActive = false;
    }
  }

  @Cron('*/30 * * * * *') // Every 30 seconds  
  async pollActiveExports() {
    // Skip if previous cycle is still running
    if (this.isExportPollingActive) {
      this.logger.debug('Skipping export polling cycle - previous cycle still in progress');
      return;
    }

    this.isExportPollingActive = true;
    this.logger.debug('Starting export status polling cycle');
    
    try {
      // Find all repositories with active exports (for GHES mode)
      const activeExports = await this.repositoryMigrationModel.find({
        $and: [
          {
            $and: [
              { gitSourceExportId: { $exists: true, $ne: null } },
              { metadataExportId: { $exists: true, $ne: null } },
            ],
          },
          {
            $or: [
              { gitSourceExportState: { $in: ['pending', 'exporting'] } },
              { metadataExportState: { $in: ['pending', 'exporting'] } },
            ],
          },
          { exportPolling: { $ne: false } }, // Poll unless explicitly disabled
        ],
      });

      this.logger.debug(`Found ${activeExports.length} active exports to poll`);

      for (const migration of activeExports) {
        await this.checkExportStatus(migration);
      }
    } catch (error) {
      this.logger.error('Error during export polling cycle:', error);
    } finally {
      this.isExportPollingActive = false;
    }
  }

  private async checkMigrationStatus(migration: RepositoryMigrationDocument) {
    try {
      const migrationId = migration.repositoryMigrationId!;
      this.logger.debug(`Checking status for migration ${migrationId}`);
      
      const statusResponse = await this.migrationService.getMigrationStatus(migrationId);
      
      if (statusResponse.success) {
        const newState = statusResponse.state.toLowerCase();
        const normalizedState = newState === 'succeeded' ? 'completed' : newState;
        
        // Check if state has changed
        if (migration.lastKnownState !== normalizedState) {
          this.logger.log(`Migration ${migrationId} state changed: ${migration.lastKnownState} -> ${normalizedState}`);
          
          // Update database - only update migration-specific fields
          await this.repositoryMigrationModel.findByIdAndUpdate(migration._id, {
            state: normalizedState,
            failureReason: statusResponse.failureReason || '',
            lastKnownState: normalizedState,
            lastPolledAt: new Date(),
            migrationPolling: !['completed', 'failed'].includes(normalizedState), // Only control migration polling
          });

          // Notify WebSocket clients
          this.migrationStatusGateway.notifyMigrationUpdate(migrationId, {
            state: normalizedState,
            failureReason: statusResponse.failureReason || '',
            repoId: migration._id.toString(),
          });
        } else {
          // Just update last polled time
          await this.repositoryMigrationModel.findByIdAndUpdate(migration._id, {
            lastPolledAt: new Date(),
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error checking migration status for ${migration.repositoryMigrationId}:`, error);
    }
  }

  private async checkExportStatus(migration: RepositoryMigrationDocument) {
    try {
      const orgName = this.extractOrgFromUrl(migration.sourceRepositoryUrl);
      if (!orgName || !migration.gitSourceExportId || !migration.metadataExportId) {
        return;
      }

      this.logger.debug(`Checking export status for repo ${migration._id}`);
      
      const [gitResponse, metadataResponse] = await Promise.all([
        this.exportService.getExportStatus(orgName, migration.gitSourceExportId),
        this.exportService.getExportStatus(orgName, migration.metadataExportId),
      ]);

      if (gitResponse.success && metadataResponse.success) {
        const gitState = gitResponse.state;
        const metadataState = metadataResponse.state;
        
        // Check if any export state has changed
        const gitChanged = migration.gitSourceExportState !== gitState;
        const metadataChanged = migration.metadataExportState !== metadataState;
        
        if (gitChanged || metadataChanged) {
          this.logger.log(`Export states changed for repo ${migration._id}: git: ${gitState}, metadata: ${metadataState}`);
          
          // Update database - only update export-specific fields
          await this.repositoryMigrationModel.findByIdAndUpdate(migration._id, {
            gitSourceExportState: gitState,
            metadataExportState: metadataState,
            gitSourceArchiveUrl: gitResponse.archiveUrl || migration.gitSourceArchiveUrl,
            metadataArchiveUrl: metadataResponse.archiveUrl || migration.metadataArchiveUrl,
            lastPolledAt: new Date(),
            exportPolling: !(
              ['exported', 'failed'].includes(gitState) && 
              ['exported', 'failed'].includes(metadataState)
            ),
          });

          // Notify WebSocket clients
          this.migrationStatusGateway.notifyExportUpdate(migration._id.toString(), {
            gitSourceExportState: gitState,
            metadataExportState: metadataState,
            gitSourceArchiveUrl: gitResponse.archiveUrl,
            metadataArchiveUrl: metadataResponse.archiveUrl,
          });
        } else {
          // Just update last polled time
          await this.repositoryMigrationModel.findByIdAndUpdate(migration._id, {
            lastPolledAt: new Date(),
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error checking export status for repo ${migration._id}:`, error);
    }
  }

  private extractOrgFromUrl(url: string): string | null {
    const match = url.match(/\/([^\/]+)\/[^\/]+$/);
    return match ? match[1] : null;
  }

  // Method to start polling for a specific migration
  async startPollingMigration(repoId: string) {
    await this.repositoryMigrationModel.findByIdAndUpdate(repoId, {
      migrationPolling: true,
      lastPolledAt: new Date(),
    });
    this.logger.log(`Started migration polling for ${repoId}`);
  }

  // Method to start polling for a specific export
  async startPollingExport(repoId: string) {
    await this.repositoryMigrationModel.findByIdAndUpdate(repoId, {
      exportPolling: true,
      lastPolledAt: new Date(),
    });
    this.logger.log(`Started export polling for ${repoId}`);
  }

  // Method to stop migration polling for a repository
  async stopPollingMigration(repoId: string) {
    await this.repositoryMigrationModel.findByIdAndUpdate(repoId, {
      migrationPolling: false,
    });
    this.logger.log(`Stopped migration polling for ${repoId}`);
  }

  // Method to stop export polling for a repository
  async stopPollingExport(repoId: string) {
    await this.repositoryMigrationModel.findByIdAndUpdate(repoId, {
      exportPolling: false,
    });
    this.logger.log(`Stopped export polling for ${repoId}`);
  }
}
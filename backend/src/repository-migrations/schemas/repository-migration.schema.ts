import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RepositoryMigrationDocument = HydratedDocument<RepositoryMigration>;

@Schema({ collection: 'repository_migrations', timestamps: true })
export class RepositoryMigration {
  @Prop({ type: String, required: true, trim: true })
  repositoryName!: string;

  @Prop({ type: String, required: true, trim: true })
  sourceRepositoryUrl!: string;

  @Prop({ type: String })
  destinationOwnerId?: string;

  @Prop({ type: String })
  migrationSourceId?: string;

  @Prop({ type: String })
  repositoryMigrationId?: string;

  @Prop({ type: String })
  state?: string;

  @Prop({ type: String })
  failureReason?: string;

  @Prop({ type: Boolean, default: false })
  lockSource!: boolean;

  @Prop({ type: String, default: 'private' })
  repositoryVisibility!: string;

  @Prop({ type: Boolean, default: false })
  archived!: boolean;

  @Prop({ type: String })
  gitSourceExportId?: string;

  @Prop({ type: String })
  metadataExportId?: string;

  @Prop({ type: String })
  gitSourceExportState?: string;

  @Prop({ type: String })
  metadataExportState?: string;

  @Prop({ type: String })
  gitSourceArchiveUrl?: string;

  @Prop({ type: String })
  metadataArchiveUrl?: string;

  @Prop({ type: String })
  exportFailureReason?: string;

  @Prop({ type: Boolean, default: false })
  exportPolling?: boolean;

  @Prop({ type: Boolean, default: false })
  migrationPolling?: boolean;

  @Prop({ type: Date })
  lastPolledAt?: Date;

  @Prop({ type: String })
  lastKnownState?: string;
}

export const RepositoryMigrationSchema = SchemaFactory.createForClass(RepositoryMigration);
RepositoryMigrationSchema.index({ repositoryName: 1, sourceRepositoryUrl: 1 }, { unique: true });
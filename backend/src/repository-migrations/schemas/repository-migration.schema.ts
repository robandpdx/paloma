import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RepositoryMigrationDocument = HydratedDocument<RepositoryMigration>;

@Schema({ collection: 'repository_migrations', timestamps: true })
export class RepositoryMigration {
  @Prop({ required: true, trim: true })
  repositoryName!: string;

  @Prop({ required: true, trim: true })
  sourceRepositoryUrl!: string;

  @Prop()
  destinationOwnerId?: string;

  @Prop()
  migrationSourceId?: string;

  @Prop()
  repositoryMigrationId?: string;

  @Prop()
  state?: string;

  @Prop()
  failureReason?: string;

  @Prop({ default: false })
  lockSource!: boolean;

  @Prop({ default: 'private' })
  repositoryVisibility!: string;

  @Prop({ default: false })
  archived!: boolean;

  @Prop()
  gitSourceExportId?: string;

  @Prop()
  metadataExportId?: string;

  @Prop()
  gitSourceExportState?: string;

  @Prop()
  metadataExportState?: string;

  @Prop()
  gitSourceArchiveUrl?: string;

  @Prop()
  metadataArchiveUrl?: string;

  @Prop()
  exportFailureReason?: string;
}

export const RepositoryMigrationSchema = SchemaFactory.createForClass(RepositoryMigration);
RepositoryMigrationSchema.index({ repositoryName: 1, sourceRepositoryUrl: 1 }, { unique: true });
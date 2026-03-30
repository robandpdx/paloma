import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FlattenMaps, Model, Types } from 'mongoose';
import { CreateRepositoryMigrationDto } from './dto/create-repository-migration.dto';
import { UpdateRepositoryMigrationDto } from './dto/update-repository-migration.dto';
import {
  RepositoryMigration,
  RepositoryMigrationDocument,
} from './schemas/repository-migration.schema';

@Injectable()
export class RepositoryMigrationsService {
  constructor(
    @InjectModel(RepositoryMigration.name)
    private readonly repositoryMigrationModel: Model<RepositoryMigrationDocument>,
  ) {}

  async list(includeArchived = false) {
    const filter = includeArchived ? {} : { archived: { $ne: true } };
    const documents = await this.repositoryMigrationModel.find(filter).sort({ repositoryName: 1 }).lean();

    return documents.map((document) => this.toResponse(document));
  }

  async create(payload: CreateRepositoryMigrationDto) {
    const createdDocument = await this.repositoryMigrationModel.create({
      lockSource: false,
      repositoryVisibility: 'private',
      archived: false,
      ...payload,
    });

    return this.toResponse(createdDocument.toObject());
  }

  async update(id: string, payload: UpdateRepositoryMigrationDto) {
    const updatedDocument = await this.repositoryMigrationModel
      .findByIdAndUpdate(id, payload, { new: true, runValidators: true })
      .lean();

    if (!updatedDocument) {
      throw new NotFoundException(`Repository migration ${id} not found`);
    }

    return this.toResponse(updatedDocument);
  }

  async remove(id: string) {
    const deletedDocument = await this.repositoryMigrationModel.findByIdAndDelete(id).lean();

    if (!deletedDocument) {
      throw new NotFoundException(`Repository migration ${id} not found`);
    }

    return {
      success: true,
      id,
    };
  }

  private toResponse(document: unknown) {
    const typedDocument = document as FlattenMaps<RepositoryMigration> & {
      _id: Types.ObjectId;
      __v?: number;
    };
    const { _id, __v, ...rest } = typedDocument;

    return {
      id: String(_id),
      ...rest,
    };
  }
}
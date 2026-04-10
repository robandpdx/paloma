import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { RepositoryMigrationsService } from './repository-migrations.service';
import { RepositoryMigration } from './schemas/repository-migration.schema';

describe('RepositoryMigrationsService', () => {
  let service: RepositoryMigrationsService;

  const mockDocument = {
    _id: { toString: () => '507f1f77bcf86cd799439011' },
    repositoryName: 'test-repo',
    sourceRepositoryUrl: 'https://github.com/org/test-repo',
    state: 'pending',
    lockSource: false,
    repositoryVisibility: 'private',
    archived: false,
  };

  const mockModel = {
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([mockDocument]),
      }),
    }),
    create: jest.fn().mockResolvedValue({
      toObject: () => mockDocument,
    }),
    findByIdAndUpdate: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockDocument),
    }),
    findByIdAndDelete: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockDocument),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepositoryMigrationsService,
        {
          provide: getModelToken(RepositoryMigration.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<RepositoryMigrationsService>(RepositoryMigrationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('list', () => {
    it('should return repositories excluding archived by default', async () => {
      const result = await service.list();
      expect(mockModel.find).toHaveBeenCalledWith({ archived: { $ne: true } });
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).not.toHaveProperty('_id');
    });

    it('should return all repositories when includeArchived is true', async () => {
      await service.list(true);
      expect(mockModel.find).toHaveBeenCalledWith({});
    });
  });

  describe('create', () => {
    it('should create a repository migration with defaults', async () => {
      const payload = {
        repositoryName: 'new-repo',
        sourceRepositoryUrl: 'https://github.com/org/new-repo',
      };

      const result = await service.create(payload);
      expect(mockModel.create).toHaveBeenCalledWith({
        lockSource: false,
        repositoryVisibility: 'private',
        archived: false,
        ...payload,
      });
      expect(result).toHaveProperty('id');
    });
  });

  describe('update', () => {
    it('should update and return the repository', async () => {
      const result = await service.update('507f1f77bcf86cd799439011', { state: 'queued' });
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        { state: 'queued' },
        { new: true, runValidators: true },
      );
      expect(result).toHaveProperty('id');
    });

    it('should throw NotFoundException when repository not found', async () => {
      mockModel.findByIdAndUpdate.mockReturnValueOnce({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(service.update('nonexistent', { state: 'queued' }))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete and return success', async () => {
      const result = await service.remove('507f1f77bcf86cd799439011');
      expect(result).toEqual({ success: true, id: '507f1f77bcf86cd799439011' });
    });

    it('should throw NotFoundException when repository not found', async () => {
      mockModel.findByIdAndDelete.mockReturnValueOnce({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove('nonexistent'))
        .rejects.toThrow(NotFoundException);
    });
  });
});

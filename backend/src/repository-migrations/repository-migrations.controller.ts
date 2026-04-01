import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateRepositoryMigrationDto } from './dto/create-repository-migration.dto';
import { UpdateRepositoryMigrationDto } from './dto/update-repository-migration.dto';
import { RepositoryMigrationsService } from './repository-migrations.service';

@Controller('repository-migrations')
export class RepositoryMigrationsController {
  constructor(private readonly repositoryMigrationsService: RepositoryMigrationsService) {}

  @Get()
  list(@Query('includeArchived') includeArchived?: string) {
    const parsedIncludeArchived = includeArchived === 'true';

    return this.repositoryMigrationsService.list(parsedIncludeArchived);
  }

  @Post()
  create(@Body() payload: CreateRepositoryMigrationDto) {
    return this.repositoryMigrationsService.create(payload);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() payload: UpdateRepositoryMigrationDto,
  ) {
    return this.repositoryMigrationsService.update(id, payload);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.repositoryMigrationsService.remove(id);
  }
}
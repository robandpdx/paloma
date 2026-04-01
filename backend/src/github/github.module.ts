import { Module } from '@nestjs/common';
import { EnvironmentService } from '../config/environment.service';
import { GitHubController } from './github.controller';
import { GitHubService } from './github.service';

@Module({
  controllers: [GitHubController],
  providers: [GitHubService, EnvironmentService],
  exports: [GitHubService],
})
export class GitHubModule {}
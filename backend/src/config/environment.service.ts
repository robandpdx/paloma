import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppEnvironment } from './env.validation';

@Injectable()
export class EnvironmentService {
  constructor(private readonly configService: ConfigService<AppEnvironment, true>) {}

  get port(): number {
    return this.configService.get('port', { infer: true });
  }

  get mongoUri(): string {
    return this.configService.get('mongoUri', { infer: true });
  }

  get targetOrganization(): string | undefined {
    return this.configService.get('targetOrganization', { infer: true });
  }

  get sourceAdminToken(): string | undefined {
    return this.configService.get('sourceAdminToken', { infer: true });
  }

  get targetAdminToken(): string | undefined {
    return this.configService.get('targetAdminToken', { infer: true });
  }

  get mode(): 'GH' | 'GHES' {
    return this.configService.get('mode', { infer: true });
  }

  get ghesApiUrl(): string | undefined {
    return this.configService.get('ghesApiUrl', { infer: true });
  }

  get corsOrigin(): string[] {
    return this.configService.get('corsOrigin', { infer: true });
  }
}
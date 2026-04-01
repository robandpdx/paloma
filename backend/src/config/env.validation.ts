type GitHubMode = 'GH' | 'GHES';

interface RawEnvironment {
  PORT?: string;
  MONGODB_URI?: string;
  TARGET_ORGANIZATION?: string;
  SOURCE_ADMIN_TOKEN?: string;
  TARGET_ADMIN_TOKEN?: string;
  MODE?: string;
  GHES_API_URL?: string;
  CORS_ORIGIN?: string;
}

function parsePort(value: string | undefined): number {
  if (!value) {
    return 5005;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('PORT must be a positive integer');
  }

  return port;
}

export interface AppEnvironment {
  port: number;
  mongoUri: string;
  targetOrganization?: string;
  sourceAdminToken?: string;
  targetAdminToken?: string;
  mode: GitHubMode;
  ghesApiUrl?: string;
  corsOrigin: string[];
}

export function validateEnvironment(config: RawEnvironment): AppEnvironment {
  if (!config.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is required');
  }

  const mode = (config.MODE ?? 'GH').toUpperCase() as GitHubMode;
  if (mode !== 'GH' && mode !== 'GHES') {
    throw new Error('MODE must be either GH or GHES');
  }

  if (mode === 'GHES' && !config.GHES_API_URL) {
    throw new Error('GHES_API_URL environment variable is required when MODE is GHES');
  }

  return {
    port: parsePort(config.PORT),
    mongoUri: config.MONGODB_URI,
    targetOrganization: config.TARGET_ORGANIZATION,
    sourceAdminToken: config.SOURCE_ADMIN_TOKEN,
    targetAdminToken: config.TARGET_ADMIN_TOKEN,
    mode,
    ghesApiUrl: config.GHES_API_URL,
    corsOrigin: config.CORS_ORIGIN
      ? config.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
      : [],
  };
}
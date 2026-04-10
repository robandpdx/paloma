export const MIGRATION_STATES = [
  'pending',
  'queued',
  'in_progress',
  'completed',
  'failed',
  'reset',
] as const;

export type MigrationState = (typeof MIGRATION_STATES)[number];

export const EXPORT_STATES = [
  'pending',
  'exporting',
  'exported',
  'failed',
] as const;

export type ExportState = (typeof EXPORT_STATES)[number];

export const REPO_VISIBILITIES = ['private', 'public', 'internal'] as const;

export type RepoVisibility = (typeof REPO_VISIBILITIES)[number];

export interface RepositoryMigration {
  id: string;
  repositoryName: string;
  sourceRepositoryUrl: string;
  destinationOwnerId?: string;
  migrationSourceId?: string;
  repositoryMigrationId?: string;
  state?: MigrationState;
  failureReason?: string;
  lockSource?: boolean;
  repositoryVisibility?: RepoVisibility;
  archived?: boolean;
  gitSourceExportId?: string;
  metadataExportId?: string;
  gitSourceExportState?: ExportState;
  metadataExportState?: ExportState;
  gitSourceArchiveUrl?: string;
  metadataArchiveUrl?: string;
  exportFailureReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RuntimeConfig {
  apiBaseUrl: string;
  targetOrganization: string;
  targetDescription: string;
  sourceDescription: string;
  mode: string;
}

interface StartMigrationPayload {
  sourceRepositoryUrl: string;
  repositoryName: string;
  targetRepoVisibility?: "private" | "public" | "internal" | string;
  continueOnError?: boolean;
  lockSource?: boolean;
  destinationOwnerId?: string;
  gitSourceArchiveUrl?: string;
  metadataArchiveUrl?: string;
}

interface UnlockSourceRepoPayload {
  sourceRepositoryUrl: string;
  migrationSourceId: string;
  repositoryName: string;
}

interface StartExportPayload {
  organizationName: string;
  repositoryNames: string[];
  lockSource?: boolean;
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5005/api",
  targetOrganization: "",
  targetDescription: "",
  sourceDescription: "",
  mode: "GH",
};

let runtimeConfigPromise: Promise<RuntimeConfig> | null = null;

async function loadClientRuntimeConfig(): Promise<RuntimeConfig> {
  try {
    const response = await fetch("/api/runtime-config", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to load runtime config: ${response.status}`);
    }

    return response.json() as Promise<RuntimeConfig>;
  } catch (error) {
    console.error("Failed to load runtime config", error);
    return DEFAULT_RUNTIME_CONFIG;
  }
}

export async function getRuntimeConfig(): Promise<RuntimeConfig> {
  if (typeof window === "undefined") {
    return {
      apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_RUNTIME_CONFIG.apiBaseUrl,
      targetOrganization: process.env.TARGET_ORGANIZATION || "",
      targetDescription: process.env.TARGET_DESCRIPTION || "",
      sourceDescription: process.env.SOURCE_DESCRIPTION || "",
      mode: process.env.MODE || DEFAULT_RUNTIME_CONFIG.mode,
    };
  }

  if (!runtimeConfigPromise) {
    runtimeConfigPromise = loadClientRuntimeConfig();
  }

  return runtimeConfigPromise;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...restOptions } = options;
  const runtimeConfig = await getRuntimeConfig();
  const requestInit: RequestInit = {
    ...restOptions,
    headers: {
      "Content-Type": "application/json",
      ...(headers ?? {}),
    },
  };

  if (body !== undefined) {
    requestInit.body = JSON.stringify(body);
  }

  const response = await fetch(`${runtimeConfig.apiBaseUrl}${path}`, requestInit);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

class PalomaApiClient {
  listRepositoryMigrations(includeArchived = true) {
    return request<RepositoryMigration[]>(`/repository-migrations?includeArchived=${includeArchived}`);
  }

  createRepositoryMigration(payload: Omit<RepositoryMigration, "id">) {
    return request<RepositoryMigration>("/repository-migrations", {
      method: "POST",
      body: payload,
    });
  }

  updateRepositoryMigration(id: string, payload: Partial<RepositoryMigration>) {
    return request<RepositoryMigration>(`/repository-migrations/${id}`, {
      method: "PATCH",
      body: payload,
    });
  }

  async deleteRepositoryMigration(id: string) {
    await request(`/repository-migrations/${id}`, {
      method: "DELETE",
    });
  }

  getOwnerId() {
    return request<{ success: boolean; ownerId: string; organization: string }>("/github/owner");
  }

  startMigration(payload: StartMigrationPayload) {
    return request<{
      success: boolean;
      message: string;
      migrationId: string;
      sourceUrl: string;
      migrationSourceId: string;
      ownerId: string;
      repositoryName: string;
      sourceRepositoryUrl: string;
    }>("/github/migrations", {
      method: "POST",
      body: payload,
    });
  }

  checkMigrationStatus(migrationId: string) {
    return request<{
      success: boolean;
      migrationId: string;
      sourceUrl: string;
      state: string;
      failureReason?: string;
      migrationSource: { name: string };
    }>(`/github/migrations/${migrationId}`);
  }

  deleteTargetRepo(repositoryName: string) {
    return request<{ success: boolean; message: string }>(`/github/target-repositories/${repositoryName}`, {
      method: "DELETE",
    });
  }

  unlockSourceRepo(payload: UnlockSourceRepoPayload) {
    return request<{ success: boolean; message: string }>("/github/source-repositories/unlock", {
      method: "POST",
      body: payload,
    });
  }

  scanSourceOrg(organizationName: string) {
    return request<{
      success: boolean;
      organization: string;
      repositoryCount: number;
      repositories: Array<{
        name: string;
        full_name: string;
        html_url: string;
        private: boolean;
        description: string | null;
      }>;
    }>("/github/source-organizations/scan", {
      method: "POST",
      body: { organizationName },
    });
  }

  startExport(payload: StartExportPayload) {
    return request<{
      success: boolean;
      message: string;
      gitSourceExportId: number;
      metadataExportId: number;
      gitSourceExportState: string;
      metadataExportState: string;
    }>("/github/exports", {
      method: "POST",
      body: payload,
    });
  }

  checkExportStatus(organizationName: string, exportId: string) {
    return request<{
      success: boolean;
      exportId: number;
      state: string;
      createdAt: string;
      updatedAt: string;
      archiveUrl?: string;
    }>(`/github/exports/${organizationName}/${exportId}`);
  }
}

export const apiClient = new PalomaApiClient();
export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export interface OwnerInfoData {
  organization: {
    login: string;
    id: string;
    name: string;
    databaseId: number;
  };
}

export interface CreateMigrationSourceData {
  createMigrationSource: {
    migrationSource: {
      id: string;
      name: string;
      url: string;
      type: string;
    };
  };
}

export interface StartRepositoryMigrationData {
  startRepositoryMigration: {
    repositoryMigration: {
      id: string;
      migrationSource: {
        id: string;
        name: string;
        type: string;
      };
      sourceUrl: string;
    };
  };
}

export interface MigrationNode {
  id: string;
  sourceUrl: string;
  migrationSource: {
    name: string;
  };
  state: string;
  failureReason?: string;
}

export interface ExportResponse {
  id: number;
  state: string;
}

export interface ExportStatusResponse {
  id: number;
  state: string;
  created_at: string;
  updated_at: string;
}

export interface Migration {
  id: number;
  guid: string;
  state: string;
  lock_repositories: boolean;
  repositories: Array<{
    id: number;
    node_id: string;
    name: string;
    full_name: string;
    owner: {
      login: string;
    };
  }>;
}

export interface ScannedRepository {
  name: string;
  full_name: string;
  html_url: string;
  private: boolean;
  description: string | null;
}
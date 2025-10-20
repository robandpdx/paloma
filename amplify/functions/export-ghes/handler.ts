import type { Handler } from 'aws-lambda';

const MODE_GHES = 'GHES';

interface ExportArgs {
  sourceOrganization: string;
  repositoryName: string;
}
interface ExportEvent { arguments: ExportArgs }

interface GhesMigrationInfo { id: number; state: string }

function deriveStatus(git?: GhesMigrationInfo, meta?: GhesMigrationInfo): string {
  if (!git || !meta) return 'STARTED';
  const g = git.state; const m = meta.state;
  if (g === 'failed' && m === 'failed') return 'FAILED';
  if ((g === 'failed' && m === 'exported') || (m === 'failed' && g === 'exported')) return 'FAILED_PARTIAL';
  if (g === 'failed' || m === 'failed') return 'FAILED';
  if (g === 'exported' && m === 'exported') return 'EXPORTED_BOTH';
  if (g === 'exported' || m === 'exported') return 'EXPORTING_PARTIAL';
  if (g === 'exporting' || m === 'exporting') return 'EXPORTING';
  return 'STARTED';
}

export const handler: Handler = async (event: ExportEvent) => {
  console.log('export-ghes invoked', JSON.stringify(event));
  const { sourceOrganization, repositoryName } = event.arguments;
  const MODE = process.env.MODE || 'GH';
  const GHES_API_URL = process.env.GHES_API_URL;
  const SOURCE_ADMIN_TOKEN = process.env.SOURCE_ADMIN_TOKEN;

  try {
    if (MODE !== MODE_GHES) {
      throw new Error('export-ghes can only be used when MODE=GHES');
    }
    if (!GHES_API_URL) throw new Error('GHES_API_URL not set');
    if (!SOURCE_ADMIN_TOKEN) throw new Error('SOURCE_ADMIN_TOKEN not set');
    if (!sourceOrganization) throw new Error('sourceOrganization argument required');
    if (!repositoryName) throw new Error('repositoryName argument required');

    async function start(body: Record<string, unknown>): Promise<GhesMigrationInfo> {
      const resp = await fetch(`${GHES_API_URL}/orgs/${sourceOrganization}/migrations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SOURCE_ADMIN_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`Failed to start GHES migration: ${resp.status} ${resp.statusText} - ${t}`);
      }
      const data = await resp.json();
      return { id: data.id, state: data.state };
    }

    const gitMigration = await start({ repositories: [repositoryName], exclude_metadata: true });
    const metadataMigration = await start({ repositories: [repositoryName], exclude_git_data: true, exclude_releases: false, exclude_owner_projects: true });

    const status = deriveStatus(gitMigration, metadataMigration);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        mode: MODE_GHES,
        message: 'GHES export migrations started',
        ghes: {
          sourceOrganization,
          repositoryName,
          gitMigration,
          metadataMigration,
          exportStatus: status,
        }
      })
    };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ success: false, message: e instanceof Error ? e.message : 'Unknown error' }) };
  }
};

import type { Handler } from 'aws-lambda';

const MODE_GHES = 'GHES';

interface Args {
  sourceOrganization: string;
  repositoryName: string;
  gitMigrationId: number;
  metadataMigrationId: number;
}
interface Event { arguments: Partial<Args> }

interface Migration { id: number; state: string; failure_reason?: string }

function deriveStatus(g: Migration, m: Migration): string {
  if (g.state === 'failed' && m.state === 'failed') return 'FAILED';
  if (g.state === 'failed' || m.state === 'failed') return 'FAILED_PARTIAL';
  if (g.state === 'exported' && m.state === 'exported') return 'EXPORTED_BOTH';
  if (g.state === 'exported' || m.state === 'exported') return 'EXPORTING_PARTIAL';
  if (g.state === 'exporting' || m.state === 'exporting' || g.state === 'pending' || m.state === 'pending') return 'EXPORTING';
  return 'STARTED';
}

export const handler: Handler = async (event: Event) => {
  console.log('check-ghes-export-status', JSON.stringify(event));
  const MODE = process.env.MODE || 'GH';
  const GHES_API_URL = process.env.GHES_API_URL;
  const SOURCE_ADMIN_TOKEN = process.env.SOURCE_ADMIN_TOKEN;
  const { sourceOrganization, repositoryName, gitMigrationId, metadataMigrationId } = event.arguments;

  try {
    if (MODE !== MODE_GHES) throw new Error('check-ghes-export-status only valid when MODE=GHES');
    if (!GHES_API_URL) throw new Error('GHES_API_URL not set');
    if (!SOURCE_ADMIN_TOKEN) throw new Error('SOURCE_ADMIN_TOKEN not set');
    if (!sourceOrganization) throw new Error('sourceOrganization required');
    if (!repositoryName) throw new Error('repositoryName required');
    if (!gitMigrationId || !metadataMigrationId) throw new Error('gitMigrationId and metadataMigrationId required');

    async function fetchMig(id: number): Promise<Migration> {
      const r = await fetch(`${GHES_API_URL}/orgs/${sourceOrganization}/migrations/${id}`, {
        headers: { 'Authorization': `Bearer ${SOURCE_ADMIN_TOKEN}`, 'Accept': 'application/vnd.github+json' }
      });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(`Failed to fetch migration ${id}: ${r.status} ${r.statusText} - ${t}`);
      }
      const data = await r.json();
      return { id: data.id, state: data.state, failure_reason: data.failure_reason };
    }
    const git = await fetchMig(gitMigrationId);
    const meta = await fetchMig(metadataMigrationId);
    const exportStatus = deriveStatus(git, meta);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        mode: MODE_GHES,
        ghes: {
          sourceOrganization,
          repositoryName,
          git: { id: git.id, state: git.state },
          metadata: { id: meta.id, state: meta.state },
          exportStatus,
          done: exportStatus === 'EXPORTED_BOTH'
        }
      })
    };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ success: false, message: e instanceof Error ? e.message : 'Unknown error' }) };
  }
};

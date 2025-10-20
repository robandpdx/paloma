/**
 * Tests for export-ghes handler
 */
import { handler } from './handler';

type Event = { arguments: { sourceOrganization: string; repositoryName: string } };

const createEvent = (overrides: Partial<Event['arguments']> = {}): Event => ({
  arguments: {
    sourceOrganization: 'src-org',
    repositoryName: 'repo-one',
    ...overrides
  }
});

function mockFetchSequence(responses: any[]) {
  let i = 0;
  global.fetch = jest.fn().mockImplementation(() => {
    const data = responses[i++];
    return Promise.resolve({
      ok: true,
      status: 201,
      json: async () => data
    });
  });
}

describe('export-ghes handler', () => {
  const originalEnv = process.env;
  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.resetAllMocks();
  });
  afterAll(() => { process.env = originalEnv; });

  test('errors when MODE != GHES', async () => {
    process.env.MODE = 'GH';
    const res: any = await handler(createEvent(), {} as any, () => {});
    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.body);
    expect(body.message).toContain('MODE=GHES');
  });

  test('errors when GHES_API_URL missing', async () => {
    process.env.MODE = 'GHES';
    process.env.SOURCE_ADMIN_TOKEN = 'tok';
    const res: any = await handler(createEvent(), {} as any, () => {});
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).message).toContain('GHES_API_URL');
  });

  test('starts two migrations and returns export status', async () => {
    process.env.MODE = 'GHES';
    process.env.GHES_API_URL = 'https://ghes.example.com/api/v3';
    process.env.SOURCE_ADMIN_TOKEN = 'tok';

    // First POST -> git migration (exporting), second POST -> metadata (pending)
    mockFetchSequence([
      { id: 101, state: 'exporting' },
      { id: 202, state: 'pending' }
    ]);

    const res: any = await handler(createEvent(), {} as any, () => {});
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.ghes.gitMigration.id).toBe(101);
    expect(body.ghes.metadataMigration.id).toBe(202);
    expect(body.ghes.exportStatus).toBe('EXPORTING');
  });
});

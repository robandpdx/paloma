/**
 * Tests for check-ghes-export-status handler
 */
import { handler } from './handler';

type Event = { arguments: { sourceOrganization: string; repositoryName: string; gitMigrationId: number; metadataMigrationId: number } };

const createEvent = (overrides: Partial<Event['arguments']> = {}): Event => ({
  arguments: {
    sourceOrganization: 'src-org',
    repositoryName: 'repo-one',
    gitMigrationId: 101,
    metadataMigrationId: 202,
    ...overrides
  }
});

function mockFetchPair(git: any, meta: any) {
  let i = 0;
  global.fetch = jest.fn().mockImplementation(() => {
    const data = i++ === 0 ? git : meta;
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => data
    });
  });
}

describe('check-ghes-export-status handler', () => {
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
    expect(JSON.parse(res.body).message).toContain('MODE=GHES');
  });

  test('errors when migration IDs missing', async () => {
    process.env.MODE = 'GHES';
    process.env.GHES_API_URL = 'https://ghes.example.com/api/v3';
    process.env.SOURCE_ADMIN_TOKEN = 'tok';
    const res: any = await handler(createEvent({ gitMigrationId: undefined as any }), {} as any, () => {});
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).message).toContain('gitMigrationId');
  });

  test('returns EXPORTED_BOTH when both exported', async () => {
    process.env.MODE = 'GHES';
    process.env.GHES_API_URL = 'https://ghes.example.com/api/v3';
    process.env.SOURCE_ADMIN_TOKEN = 'tok';

    mockFetchPair({ id: 101, state: 'exported' }, { id: 202, state: 'exported' });

    const res: any = await handler(createEvent(), {} as any, () => {});
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ghes.exportStatus).toBe('EXPORTED_BOTH');
    expect(body.ghes.done).toBe(true);
  });
});

import { parseCSV } from './csvParser';

describe('parseCSV', () => {
  it('parses basic CSV with no header', () => {
    const text = 'https://github.com/org/repo1,private,true\nhttps://github.com/org/repo2,public,false';
    const result = parseCSV(text);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      sourceRepoUrl: 'https://github.com/org/repo1',
      repoName: 'repo1',
      repositoryVisibility: 'private',
      lockSource: true,
    });
    expect(result[1]).toEqual({
      sourceRepoUrl: 'https://github.com/org/repo2',
      repoName: 'repo2',
      repositoryVisibility: 'public',
      lockSource: false,
    });
  });

  it('skips header line when present', () => {
    const text = 'source_repo_url,visibility,lock\nhttps://github.com/org/repo1,internal,false';
    const result = parseCSV(text);

    expect(result).toHaveLength(1);
    expect(result[0].repoName).toBe('repo1');
    expect(result[0].repositoryVisibility).toBe('internal');
  });

  it('defaults visibility to private and lockSource to false', () => {
    const text = 'https://github.com/org/repo1';
    const result = parseCSV(text);

    expect(result).toHaveLength(1);
    expect(result[0].repositoryVisibility).toBe('private');
    expect(result[0].lockSource).toBe(false);
  });

  it('skips empty lines', () => {
    const text = 'https://github.com/org/repo1\n\n\nhttps://github.com/org/repo2';
    const result = parseCSV(text);

    expect(result).toHaveLength(2);
  });

  it('skips lines with invalid URLs', () => {
    const text = 'not-a-url\nhttps://github.com/org/valid-repo';
    const result = parseCSV(text);

    expect(result).toHaveLength(1);
    expect(result[0].repoName).toBe('valid-repo');
  });

  it('strips .git suffix from repo names', () => {
    const text = 'https://github.com/org/repo.git';
    const result = parseCSV(text);

    expect(result).toHaveLength(1);
    expect(result[0].repoName).toBe('repo');
  });

  it('returns empty array for empty input', () => {
    expect(parseCSV('')).toEqual([]);
  });
});

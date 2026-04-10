import type { RepoVisibility } from "@/lib/api";

export interface ParsedCSVRow {
  sourceRepoUrl: string;
  repoName: string;
  repositoryVisibility: RepoVisibility;
  lockSource: boolean;
}

export function parseCSV(text: string): ParsedCSVRow[] {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  const dataLines = lines[0].toLowerCase().includes('source_repo_url') ? lines.slice(1) : lines;
  const results: ParsedCSVRow[] = [];

  for (const line of dataLines) {
    const [sourceRepoUrl, repoVisibility, lockSourceStr] = line.split(',').map(s => s.trim());
    if (!sourceRepoUrl) continue;

    const match = sourceRepoUrl.match(/github\.com\/[^\/]+\/([^\/]+)/);
    const repoName = match ? match[1].replace(/\.git$/, '') : '';
    if (!repoName) continue;

    const lockSource = lockSourceStr?.toLowerCase() === 'true';
    const visibility = (repoVisibility || 'private') as RepoVisibility;

    results.push({
      sourceRepoUrl,
      repoName,
      repositoryVisibility: visibility,
      lockSource,
    });
  }

  return results;
}

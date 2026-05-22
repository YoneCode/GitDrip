/**
 * Server-only GitHub helpers. Used by `/dashboard/[...repo]` (RSC) to show
 * commits that fed the most recent scoring window. Never imported from client.
 */
import "server-only";

const GH = "https://api.github.com";

const headers = (): HeadersInit => {
  const token = process.env.GITHUB_TOKEN;
  return {
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
};

export type Repo = {
  full_name: string;
  description: string | null;
  stargazers_count: number;
  default_branch: string;
  updated_at: string;
};

export async function getRepo(repoSlug: string): Promise<Repo | null> {
  const r = await fetch(`${GH}/repos/${repoSlug}`, {
    headers: headers(),
    next: { revalidate: 300 },
  });
  if (!r.ok) return null;
  return (await r.json()) as Repo;
}

export type Contributor = {
  login: string;
  avatar_url: string;
  contributions: number;
  type: "User" | "Bot";
};

export async function listContributors(
  repoSlug: string,
  perPage = 30,
): Promise<Contributor[]> {
  const r = await fetch(
    `${GH}/repos/${repoSlug}/contributors?per_page=${perPage}`,
    { headers: headers(), next: { revalidate: 300 } },
  );
  if (!r.ok) return [];
  const data = await r.json();
  return Array.isArray(data) ? (data as Contributor[]) : [];
}

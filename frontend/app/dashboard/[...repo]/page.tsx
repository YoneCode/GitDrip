import RepoDashboardClient from "./client";

/**
 * Static export: emit a single placeholder route so the build succeeds.
 * Cloudflare's _redirects rewrites all matching paths to this HTML; the
 * client-side router then reads the real URL and renders the correct repo.
 */
export async function generateStaticParams() {
  return [{ repo: ["_"] }];
}

export default function Page({
  params,
}: {
  params: Promise<{ repo: string[] }>;
}) {
  return <RepoDashboardClient params={params} />;
}

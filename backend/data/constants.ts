export const app_constants = {
  backend: {
    title: "Comment Sort",
    safe_title: "comment-sort",
    legacy_safe_titles: ["figcomment", "comment-sort"] as const,
    subtitle: "Sort the signal from your Figma comments",
    github_repository_url: "https://github.com/hferello/figcomment",
    site_local: "http://localhost:3000",
    site_production: "https://comment-sort.vercel.app",
    legacy_site_production: "https://figcomment.vercel.app",
    figma_origins: ["https://www.figma.com", "https://figma.com"] as const,
    null_origin: "null",
  },
} as const;

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

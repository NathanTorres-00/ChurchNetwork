/**
 * Whether the Leadership page, its links and Groups' leadership section are built. On since main 49ae49e
 * (Leadership was hidden on the live site from bbadf7e until then). To hide it on the live site again, return
 * `env.VERCEL_ENV !== "production"` here: production then leaves it out, local and preview builds keep it.
 */
export function showLeadership(_env: Record<string, string | undefined> = process.env): boolean {
  return true;
}

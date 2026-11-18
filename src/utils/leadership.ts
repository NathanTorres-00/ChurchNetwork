/**
 * Leadership is hidden on the live site for now (as on main since bbadf7e): production builds leave out the
 * Leadership page and its links and section; local and preview builds keep them. To show it on the live site,
 * make this return true and redeploy.
 */
export function showLeadership(env: Record<string, string | undefined> = process.env): boolean {
  return env.VERCEL_ENV !== "production";
}

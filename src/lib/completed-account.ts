import { createServerFn } from "@tanstack/react-start";

const SESSION_COOKIE = "__Host-grok-auth.session_token";

async function removeIncompleteUser(userId: string) {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  await sql`delete from "session" where "userId" = ${userId}`;
  await sql`delete from "account" where "userId" = ${userId}`;
  await sql`delete from sporty_accounts where user_id = ${userId}`;
  await sql`delete from player_country where user_id = ${userId}`;
  await sql`delete from referrals where user_id = ${userId}`;
  await sql`delete from "user" where id = ${userId} and "isCompleted" = false`;
}

/** Drops a signed-in account that is not isCompleted, and reports a dead session cookie. */
export const enforceCompletedAccount = createServerFn({ method: "POST" }).handler(async () => {
  const { getRequest } = await import("@tanstack/react-start/server");
  const { getSessionUser } = await import("@/lib/auth/verify.server");
  const request = getRequest();
  const hasSessionCookie = (request?.headers.get("cookie") ?? "").includes(`${SESSION_COOKIE}=`);
  const user = await getSessionUser();
  if (!user) return { signedIn: false, completed: false, stale: hasSessionCookie };
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  try {
    const rows = await sql<{ completed: boolean }>`
      select "isCompleted" as completed from "user" where id = ${user.id} limit 1
    `;
    const value = rows[0]?.completed as unknown;
    if (value === true || value === "t" || value === "true" || value === 1) {
      return { signedIn: true, completed: true, stale: false };
    }
    if (!rows.length) return { signedIn: false, completed: false, stale: true };
  } catch {
    return { signedIn: true, completed: true, stale: false };
  }
  await removeIncompleteUser(user.id);
  return { signedIn: false, completed: false, stale: true };
});

import type { Sql } from "@/lib/db";

export const BLOCKED_MESSAGE = "This account has been blocked. Contact support.";

export async function ensureBlockedUsers(sql: Sql) {
  await sql`
    create table if not exists blocked_users (
      user_id text primary key,
      blocked_at timestamptz not null default now()
    )
  `;
}

export async function isUserBlocked(sql: Sql, userId: string) {
  await ensureBlockedUsers(sql);
  const rows = await sql<{ user_id: string }>`select user_id from blocked_users where user_id = ${userId} limit 1`;
  return rows.length > 0;
}

export async function setUserBlocked(sql: Sql, userId: string, blocked: boolean) {
  await ensureBlockedUsers(sql);
  if (blocked) {
    await sql`insert into blocked_users (user_id) values (${userId}) on conflict (user_id) do nothing`;
    // Signs the person out everywhere right away.
    await sql`delete from "session" where "userId" = ${userId}`;
  } else {
    await sql`delete from blocked_users where user_id = ${userId}`;
  }
}

export async function readBlockedUsers(sql: Sql) {
  await ensureBlockedUsers(sql);
  return sql<{ id: string; email: string }>`
    select b.user_id as id, u.email as email
    from blocked_users b join "user" u on u.id = b.user_id
    order by b.blocked_at desc
  `;
}

export async function readBlockedIds(sql: Sql) {
  await ensureBlockedUsers(sql);
  const rows = await sql<{ user_id: string }>`select user_id from blocked_users`;
  return new Set(rows.map((row) => row.user_id));
}

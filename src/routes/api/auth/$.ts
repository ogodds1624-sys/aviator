import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";

function authErrorResponse(err: unknown): Response {
  const message = err instanceof Error ? err.message : "Auth request failed";
  return Response.json({ message, code: "AUTH_HANDLER_ERROR" }, { status: 500 });
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          return await auth.handler(request);
        } catch (err) {
          return authErrorResponse(err);
        }
      },
      POST: async ({ request }) => {
        if (request.headers.get("x-auth-debug") === "1") {
          try {
            const { getPglite, dbSource } = await import("@/lib/db");
            const pg = await getPglite();
            const tables = await pg.query<{ tablename: string }>(
              "select tablename from pg_tables where schemaname = 'public'",
            );
            return Response.json({ ok: true, dbSource, tables: tables.rows });
          } catch (err) {
            return Response.json(
              { ok: false, message: err instanceof Error ? err.message : String(err) },
              { status: 500 },
            );
          }
        }
        try {
          return await auth.handler(request);
        } catch (err) {
          return authErrorResponse(err);
        }
      },
    },
  },
});

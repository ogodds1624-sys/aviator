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
        try {
          return await auth.handler(request);
        } catch (err) {
          return authErrorResponse(err);
        }
      },
    },
  },
});

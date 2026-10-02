import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";

function authErrorResponse(err: unknown): Response {
  const message = err instanceof Error && err.message ? err.message : "Auth request failed";
  return Response.json({ message, code: "AUTH_HANDLER_ERROR" }, { status: 500 });
}

function transientAuthFailure(err: unknown) {
  const message = err instanceof Error ? err.message : String(err ?? "");
  return /timeout|timed out|ECONN|EAI_AGAIN|Connection|terminated|too many clients|57P01|53300|08006|08001/i.test(message);
}

async function handleAuth(request: Request): Promise<Response> {
  let again = request;
  if (request.method !== "GET" && request.method !== "HEAD") {
    try {
      again = request.clone();
    } catch {
      again = request;
    }
  }
  try {
    return await auth.handler(request);
  } catch (err) {
    if (!transientAuthFailure(err)) return authErrorResponse(err);
    try {
      return await auth.handler(again);
    } catch (retryErr) {
      return authErrorResponse(retryErr);
    }
  }
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => handleAuth(request),
      POST: async ({ request }) => handleAuth(request),
    },
  },
});

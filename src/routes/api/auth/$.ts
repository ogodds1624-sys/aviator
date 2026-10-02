import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";
import { validateOnboardingBody, type OnboardingAcceptance } from "@/lib/onboarding-gate";
import { persistOnboarding, rollbackOnboarding } from "@/lib/onboarding-persist.server";

function authErrorResponse(err: unknown): Response {
  const message = err instanceof Error && err.message ? err.message : "Auth request failed";
  return Response.json({ message, code: "AUTH_HANDLER_ERROR" }, { status: 500 });
}

function transientAuthFailure(err: unknown) {
  const message = err instanceof Error ? err.message : String(err ?? "");
  return /timeout|timed out|ECONN|EAI_AGAIN|Connection|terminated|too many clients|57P01|53300|08006|08001/i.test(message);
}

function isSignUp(request: Request) {
  return request.method === "POST" && /\/sign-up\/email\/?$/.test(new URL(request.url).pathname);
}

async function handleAuth(request: Request): Promise<Response> {
  let gate: OnboardingAcceptance | null = null;
  let outbound = request;
  if (isSignUp(request)) {
    let raw: unknown = null;
    try {
      raw = await request.json();
    } catch {
      raw = null;
    }
    const checked = validateOnboardingBody(raw);
    if (!checked.ok || checked.completionStatus !== true) {
      return Response.json(
        { message: checked.ok ? "Finish registration before creating an account." : checked.message, code: "ONBOARDING_INCOMPLETE" },
        { status: 400 },
      );
    }
    gate = checked;
    const headers = new Headers(request.headers);
    headers.delete("content-length");
    headers.delete("transfer-encoding");
    outbound = new Request(request.url, {
      method: "POST",
      headers,
      body: JSON.stringify(checked.authBody),
    });
  }

  let again = outbound;
  if (outbound.method !== "GET" && outbound.method !== "HEAD") {
    try {
      again = outbound.clone();
    } catch {
      again = outbound;
    }
  }
  let response: Response;
  try {
    response = await auth.handler(outbound);
  } catch (err) {
    if (!transientAuthFailure(err)) return authErrorResponse(err);
    try {
      response = await auth.handler(again);
    } catch (retryErr) {
      return authErrorResponse(retryErr);
    }
  }
  if (!gate || !response.ok) return response;
  try {
    await persistOnboarding(gate);
  } catch {
    try {
      await rollbackOnboarding(gate.email);
    } catch {
      // The insert already failed. A second failure must still hide the new user cookie.
    }
    return Response.json({ message: "Could not save that account.", code: "ONBOARDING_INCOMPLETE" }, { status: 500 });
  }
  return response;
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => handleAuth(request),
      POST: async ({ request }) => handleAuth(request),
    },
  },
});

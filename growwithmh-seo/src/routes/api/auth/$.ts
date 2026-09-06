import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { getAuth, hasHostedAuthConfig } from "@/lib/auth";
import { isHostedAuthMode } from "@/lib/auth-mode";

/**
 * Better Auth's client calls get-session on every page load regardless of auth
 * mode. Outside hosted mode this route has nothing to serve, and answering 404
 * logged a console error on every single render — noise that buries real
 * errors while debugging. A null session is the honest answer: these modes
 * derive identity from request headers or the environment, never from a Better
 * Auth session, so there is genuinely no session to return.
 */
function isSessionProbe(request: Request): boolean {
  return (
    request.method === "GET" &&
    new URL(request.url).pathname.endsWith("/get-session")
  );
}

async function handleAuthRequest(request: Request) {
  if (!isHostedAuthMode(env.AUTH_MODE)) {
    if (isSessionProbe(request)) {
      return Response.json(null);
    }
    return new Response("Not found", {
      status: 404,
    });
  }

  if (!hasHostedAuthConfig()) {
    return new Response("Missing Better Auth hosted configuration", {
      status: 500,
    });
  }

  const auth = getAuth();
  return auth.handler(request);
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        return handleAuthRequest(request);
      },
      POST: async ({ request }: { request: Request }) => {
        return handleAuthRequest(request);
      },
    },
  },
});

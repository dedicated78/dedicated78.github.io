/**
 * Authentication for the self-hosted MCP endpoint.
 *
 * Phase 1 verified that `POST /mcp` under `local_noauth` executed tools as
 * `admin@localhost` with no credential of any kind, with
 * `Access-Control-Allow-Origin: *`. Forty-six tools sit behind it, most of
 * which spend the operator's DataForSEO balance. That is the Phase 2 release
 * blocker this module closes.
 *
 * The rule, in order:
 *   1. `cloudflare_access` — Cloudflare Access already authenticated the
 *      request before it reached the Worker; the JWT is the credential.
 *   2. `local_noauth` + a configured MCP_AUTH_TOKEN — the token is required.
 *   3. `local_noauth` + development deployment + no token — allowed, because
 *      the operator has explicitly declared a developer machine.
 *   4. Anything else — refused.
 *
 * Case 4 is the important one: an unconfigured production deployment refuses
 * MCP rather than serving it wide open. Fail closed.
 *
 * MCP_AUTH_TOKEN is a single shared secret, which is deliberately modest: it
 * suits a self-host with one operator, and it is replaced by per-user API keys
 * once real multi-user authentication lands. It is never logged and never
 * returned in a response.
 */
import {
  isDevelopmentDeployment,
  parseDeploymentMode,
} from "@/shared/deployment-mode";

export type McpAuthDecision =
  | { ok: true; reason: "cloudflare_access" | "token" | "development" }
  | { ok: false; status: 401 | 503; error: string; description: string };

/**
 * Constant-time comparison so a wrong token cannot be recovered by timing the
 * response. Short-circuiting on length is safe: the length of a secret is not
 * the secret.
 */
function secretsMatch(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

function presentedToken(request: Request): string | null {
  const bearer = request.headers
    .get("Authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  if (bearer) return bearer;

  const header = request.headers.get("x-mcp-token")?.trim();
  return header ? header : null;
}

export function authorizeSelfHostedMcp(args: {
  request: Request;
  authMode: "cloudflare_access" | "local_noauth";
  mcpAuthToken: string | undefined;
  deploymentMode: string | undefined;
}): McpAuthDecision {
  if (args.authMode === "cloudflare_access") {
    // resolveCloudflareAccessContext validates the Access JWT and throws when
    // it is absent or invalid, so the credential check already happened.
    return { ok: true, reason: "cloudflare_access" };
  }

  const expected = args.mcpAuthToken?.trim();
  if (expected) {
    const provided = presentedToken(args.request);
    if (provided && secretsMatch(provided, expected)) {
      return { ok: true, reason: "token" };
    }
    return {
      ok: false,
      status: 401,
      error: "invalid_token",
      description:
        "This MCP endpoint requires a bearer token. Send it as `Authorization: Bearer <MCP_AUTH_TOKEN>`.",
    };
  }

  if (isDevelopmentDeployment(args.deploymentMode)) {
    return { ok: true, reason: "development" };
  }

  return {
    ok: false,
    status: 503,
    error: "mcp_not_configured",
    description:
      "The MCP endpoint is disabled because no MCP_AUTH_TOKEN is configured. " +
      "Set MCP_AUTH_TOKEN to enable it, or set DEPLOYMENT_MODE=development on a private machine.",
  };
}

export function mcpAuthErrorResponse(
  decision: Extract<McpAuthDecision, { ok: false }>,
  corsHeaders: Record<string, string>,
): Response {
  const headers = new Headers({
    ...corsHeaders,
    "Content-Type": "application/json",
  });
  if (decision.status === 401) {
    headers.set("WWW-Authenticate", 'Bearer realm="mcp"');
  }
  return new Response(
    JSON.stringify({
      error: decision.error,
      error_description: decision.description,
    }),
    { status: decision.status, headers },
  );
}

export { parseDeploymentMode };

/**
 * Site-wide HTTP Basic gate for temporary test deployments.
 *
 * WHY THIS EXISTS
 *
 * `AUTH_MODE=local_noauth` resolves every caller to a single admin with no
 * credential. That is fine on a laptop and catastrophic on a public URL — it is
 * the exact Phase 1 finding. But the alternatives need infrastructure a smoke
 * test should not have to stand up: `hosted` requires Better Auth plus Google
 * OAuth, Turnstile, an email sender and Autumn; `cloudflare_access` requires
 * the deployment to sit behind Cloudflare Access.
 *
 * So this gate puts one shared password in front of the whole application,
 * independent of the app's own auth model. It does not make anyone an
 * administrator and it grants nothing — it only decides whether a request
 * reaches the app at all.
 *
 * SCOPE AND LIFETIME
 *
 * This is a bounded shim for temporary test infrastructure, NOT a step toward
 * the commercial auth model. Real multi-user authentication is Better Auth,
 * ungated from Autumn, in a later phase. When that lands, this module and its
 * single call site are deleted.
 *
 * WHAT IT IS NOT
 *
 * Not a substitute for the MCP token: `/mcp` carries its own authentication and
 * is checked separately, so setting MCP_AUTH_TOKEN still matters even behind
 * this gate. Not a tenant boundary either — one password, one tester.
 */

const REALM = "GrowwithMH SEO (test deployment)";

/**
 * Liveness only. The platform's health probe has to reach something without a
 * credential, and this endpoint reports check statuses — never values, never
 * secrets — so exposing it costs nothing.
 */
const UNGATED_PATHS = new Set(["/api/health"]);

/** Constant-time compare so the password cannot be recovered by timing. */
function secretsMatch(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

function presentedPassword(request: Request): string | null {
  const header = request.headers.get("Authorization");
  if (!header?.toLowerCase().startsWith("basic ")) return null;
  try {
    const decoded = atob(header.slice(6).trim());
    // "user:password" — the username is ignored; one shared password.
    const separator = decoded.indexOf(":");
    return separator === -1 ? decoded : decoded.slice(separator + 1);
  } catch {
    return null;
  }
}

/**
 * Returns a 401 challenge when the gate is enabled and the request has not
 * satisfied it, or null to let the request through.
 *
 * Disabled by default: an unset `TEST_ACCESS_PASSWORD` leaves normal
 * deployments completely untouched.
 */
export function testAccessGateResponse(
  request: Request,
  testAccessPassword: string | undefined,
): Response | null {
  const expected = testAccessPassword?.trim();
  if (!expected) return null;

  const { pathname } = new URL(request.url);
  if (UNGATED_PATHS.has(pathname)) return null;

  const provided = presentedPassword(request);
  if (provided && secretsMatch(provided, expected)) return null;

  return new Response("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
      "Content-Type": "text/plain; charset=utf-8",
      // A test deployment must never be indexed.
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

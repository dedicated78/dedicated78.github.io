/**
 * Deployment posture, separate from AUTH_MODE.
 *
 * AUTH_MODE says *how* a request is authenticated. This says whether the
 * deployment is allowed to run with authentication switched off at all.
 *
 * The default is "production" on purpose. Phase 1 found `/mcp` serving 46
 * money-spending tools to anonymous callers as `admin@localhost`, protected by
 * nothing but a loopback port binding. A deployment that forgets to declare
 * itself must therefore get the *safe* behaviour, not the convenient one — an
 * operator who wants the no-auth developer mode has to ask for it explicitly.
 */
export const DEPLOYMENT_MODES = ["development", "production"] as const;

export type DeploymentMode = (typeof DEPLOYMENT_MODES)[number];

export function parseDeploymentMode(value: string | undefined): DeploymentMode {
  return value?.trim() === "development" ? "development" : "production";
}

export function isDevelopmentDeployment(value: string | undefined): boolean {
  return parseDeploymentMode(value) === "development";
}

/**
 * Whether `local_noauth` — which resolves every caller to a single admin with
 * no credential — may be used under this deployment mode.
 */
export function allowsNoAuthMode(
  deploymentMode: DeploymentMode,
  authMode: string | undefined,
): boolean {
  return authMode !== "local_noauth" || deploymentMode === "development";
}

export const NO_AUTH_IN_PRODUCTION_MESSAGE =
  "AUTH_MODE=local_noauth gives every caller full admin access with no credential. " +
  "It is a development-only mode. Set DEPLOYMENT_MODE=development to acknowledge " +
  "this on a private machine, or switch to AUTH_MODE=cloudflare_access or hosted.";

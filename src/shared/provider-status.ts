/**
 * Configuration state of an external data provider's credentials.
 *
 * The distinction that matters: a credential being *present* says nothing
 * about whether it *works*. Phase 1 found the app reporting "Set" purely
 * because the environment variable was non-empty, so an operator with a
 * mistyped key saw a green check and an unexplained failure later. These
 * states keep "we have a value" and "we proved the value works" apart.
 */
export const PROVIDER_CREDENTIAL_STATUSES = [
  /** No credential configured at all. */
  "NOT_CONFIGURED",
  /** A credential is present but has never been proven against the provider. */
  "CONFIGURED_UNVERIFIED",
  /** A free provider call succeeded with this credential. */
  "VERIFIED",
  /** The provider rejected the credential (HTTP 401/403). */
  "AUTHENTICATION_FAILED",
  /** The provider could not be reached, so the credential is unproven. */
  "PROVIDER_UNAVAILABLE",
] as const;

export type ProviderCredentialStatus =
  (typeof PROVIDER_CREDENTIAL_STATUSES)[number];

/**
 * Whether SEO features should be allowed to attempt provider calls.
 *
 * PROVIDER_UNAVAILABLE stays usable on purpose: the provider being briefly
 * unreachable is not evidence the credential is bad, and blocking the whole
 * product on one failed status probe would turn a transient outage into an
 * apparent misconfiguration.
 */
export function isProviderCredentialUsable(
  status: ProviderCredentialStatus,
): boolean {
  return (
    status === "VERIFIED" ||
    status === "CONFIGURED_UNVERIFIED" ||
    status === "PROVIDER_UNAVAILABLE"
  );
}

/** Whether the operator must act before SEO features can work. */
export function providerCredentialNeedsAttention(
  status: ProviderCredentialStatus,
): boolean {
  return status === "NOT_CONFIGURED" || status === "AUTHENTICATION_FAILED";
}

export function providerCredentialLabel(
  status: ProviderCredentialStatus,
): string {
  switch (status) {
    case "NOT_CONFIGURED":
      return "Not configured";
    case "CONFIGURED_UNVERIFIED":
      return "Configured, not verified";
    case "VERIFIED":
      return "Verified";
    case "AUTHENTICATION_FAILED":
      return "Authentication failed";
    case "PROVIDER_UNAVAILABLE":
      return "Provider unavailable";
  }
}

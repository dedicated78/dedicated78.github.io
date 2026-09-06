import { describe, expect, it } from "vitest";
import {
  isProviderCredentialUsable,
  providerCredentialLabel,
  providerCredentialNeedsAttention,
  PROVIDER_CREDENTIAL_STATUSES,
} from "./provider-status";

describe("provider credential status", () => {
  it("treats a present-but-unproven key as usable", () => {
    expect(isProviderCredentialUsable("CONFIGURED_UNVERIFIED")).toBe(true);
  });

  it("keeps working when the provider is briefly unreachable", () => {
    // An outage is not evidence the credential is bad, so features stay on.
    expect(isProviderCredentialUsable("PROVIDER_UNAVAILABLE")).toBe(true);
    expect(providerCredentialNeedsAttention("PROVIDER_UNAVAILABLE")).toBe(
      false,
    );
  });

  it("blocks the two states the operator must fix", () => {
    for (const status of ["NOT_CONFIGURED", "AUTHENTICATION_FAILED"] as const) {
      expect(isProviderCredentialUsable(status)).toBe(false);
      expect(providerCredentialNeedsAttention(status)).toBe(true);
    }
  });

  it("labels every status", () => {
    for (const status of PROVIDER_CREDENTIAL_STATUSES) {
      expect(providerCredentialLabel(status)).toBeTruthy();
    }
  });
});

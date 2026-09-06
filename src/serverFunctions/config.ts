import { createServerFn } from "@tanstack/react-start";
import { requireAuthenticatedContext } from "@/serverFunctions/middleware";
import {
  getDataforseoCredentialStatus,
  verifyDataforseoCredential,
} from "@/server/lib/dataforseo/credential-status";
import { fetchUserData } from "@/server/lib/dataforseo/appendix";
import { isProviderCredentialUsable } from "@/shared/provider-status";

/**
 * Cheap, network-free provider status for the app shell.
 *
 * `configured` is kept for existing callers, but it now means "usable" rather
 * than "the env var is non-empty" — a key DataForSEO has rejected reports
 * false, which is what the setup banner is actually asking about.
 */
export const getSeoApiKeyStatus = createServerFn({ method: "GET" })
  .middleware(requireAuthenticatedContext)
  .handler(async () => {
    const detail = await getDataforseoCredentialStatus();
    return {
      configured: isProviderCredentialUsable(detail.status),
      status: detail.status,
      checkedAt: detail.checkedAt,
      malformed: detail.malformed,
    };
  });

/**
 * Operator-triggered live check against DataForSEO's free user_data endpoint.
 *
 * Separate from the status read above so verification is an explicit act: it
 * contacts the provider, and no page render should do that on its own.
 */
export const verifySeoApiKey = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .handler(async () => {
    const detail = await verifyDataforseoCredential(() => fetchUserData());
    return {
      configured: isProviderCredentialUsable(detail.status),
      status: detail.status,
      checkedAt: detail.checkedAt,
      malformed: detail.malformed,
    };
  });

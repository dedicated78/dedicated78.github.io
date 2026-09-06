/**
 * Single source of truth for user-visible product naming.
 *
 * Upstream OpenSEO hardcodes "OpenSEO" in ~190 files. Renaming all of them
 * would rewrite MCP tool names, Durable Object bindings, telemetry event
 * names, and package identifiers — none of which a user ever sees, all of
 * which break on rename and conflict on every upstream merge. So only the
 * strings a user actually reads route through here.
 */
export const BRAND = {
  /** Product name shown in the sidebar, page title, and copy. */
  name: "GrowwithMH SEO",
  /** Compact name for tight spots (mobile top bar, manifest short_name). */
  shortName: "GrowwithMH",
  /** Owning brand, used where the operator (not the product) is meant. */
  company: "GrowwithMH",
  /** Logo served from /public. Swap the file to rebrand; keep the path. */
  logoSrc: "/transparent-logo.png",
} as const;

/** Upstream project name. Keep visible where we credit the source. */
export const UPSTREAM_NAME = "OpenSEO";

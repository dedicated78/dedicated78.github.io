/**
 * Two-level authorization model for the commercial platform.
 *
 * The two levels answer different questions and are deliberately NOT merged:
 *
 *   Platform level  — "may this person operate GrowwithMH the business?"
 *                     Billing verification, spend ceilings, customer support.
 *   Organization    — "may this person act inside this workspace?"
 *                     Projects, research, reports, members.
 *
 * The load-bearing rule, and the reason these are separate lists:
 *
 *   A PLATFORM ROLE GRANTS NO ACCESS TO A CUSTOMER'S PROJECT DATA.
 *
 * A Platform Admin can see that org_42 spent $18 yesterday and can suspend it.
 * They cannot open org_42's keyword lists, audits or reports unless they are
 * also a member of that organization. Customer SEO data is the customer's, and
 * an admin console is not a back door into it. Anything that ever needs to
 * cross that line (support impersonation) has to be built deliberately, be
 * consented to, and be written to the audit log — it must never fall out of a
 * role check by accident.
 *
 * Shared with the client so the UI can hide what the server will refuse, but
 * hiding is never the enforcement — {@link ../server/features/platform/services/authorization}
 * is.
 */

// ---------------------------------------------------------------------------
// Organization roles
// ---------------------------------------------------------------------------

export const ORGANIZATION_ROLES = [
  /** Read-only access to approved projects and reports. The client's login. */
  "client_viewer",
  /** Does the SEO work: research, tracking, audits, content. */
  "member",
  /** Runs the workspace day to day: projects, members, integrations. */
  "admin",
  /** Owns the workspace: billing, plan, ownership transfer, deletion. */
  "owner",
] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

/** Higher outranks lower. Used for "may X modify Y" comparisons. */
const ORGANIZATION_ROLE_RANK: Record<OrganizationRole, number> = {
  client_viewer: 1,
  member: 2,
  admin: 3,
  owner: 4,
};

export const DEFAULT_ORGANIZATION_ROLE: OrganizationRole = "member";

export function isOrganizationRole(value: string): value is OrganizationRole {
  return (ORGANIZATION_ROLES as readonly string[]).includes(value);
}

/**
 * Narrows the stored `member.role` text column.
 *
 * An unrecognised value resolves to the LEAST privileged role, never the
 * default: a typo or a role removed in a future version must fail toward less
 * access, not more.
 */
export function parseOrganizationRole(
  value: string | null | undefined,
): OrganizationRole {
  if (!value) return "client_viewer";
  return isOrganizationRole(value) ? value : "client_viewer";
}

export function organizationRoleOutranks(
  actor: OrganizationRole,
  target: OrganizationRole,
): boolean {
  return ORGANIZATION_ROLE_RANK[actor] > ORGANIZATION_ROLE_RANK[target];
}

// ---------------------------------------------------------------------------
// Platform roles
// ---------------------------------------------------------------------------

export const PLATFORM_ROLES = [
  /** GrowwithMH staff: support, payment verification, cost monitoring. */
  "platform_admin",
  /** Full control of the platform, including who else is staff. */
  "platform_owner",
] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export function isPlatformRole(value: string): value is PlatformRole {
  return (PLATFORM_ROLES as readonly string[]).includes(value);
}

/** Unrecognised or absent means no platform standing at all. */
export function parsePlatformRole(
  value: string | null | undefined,
): PlatformRole | null {
  if (!value) return null;
  return isPlatformRole(value) ? value : null;
}

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

/** Things a person can do inside one organization. */
export const ORGANIZATION_CAPABILITIES = [
  "project:read",
  "report:read",
  "report:create",
  "research:run",
  "keyword:write",
  "project:manage",
  "integration:manage",
  "member:read",
  "member:manage",
  "apikey:manage",
  "organization:manage",
  "billing:manage",
] as const;

export type OrganizationCapability = (typeof ORGANIZATION_CAPABILITIES)[number];

/** Things a person can do to GrowwithMH the business. */
export const PLATFORM_CAPABILITIES = [
  "platform:view_organizations",
  "platform:view_costs",
  "platform:manage_spend_controls",
  "platform:verify_payments",
  "platform:manage_plans",
  "platform:grant_credits",
  "platform:suspend_organization",
  "platform:manage_staff",
] as const;

export type PlatformCapability = (typeof PLATFORM_CAPABILITIES)[number];

/**
 * Organization capability matrix, cumulative up the ranks.
 *
 * `client_viewer` is the one that matters most to get right: a client logging
 * in to see their own reports must not be able to spend money, read API keys,
 * or see who else is in the workspace.
 */
const CLIENT_VIEWER_CAPABILITIES: OrganizationCapability[] = [
  "project:read",
  "report:read",
];

const MEMBER_CAPABILITIES: OrganizationCapability[] = [
  ...CLIENT_VIEWER_CAPABILITIES,
  "report:create",
  "research:run",
  "keyword:write",
  "member:read",
];

const ADMIN_CAPABILITIES: OrganizationCapability[] = [
  ...MEMBER_CAPABILITIES,
  "project:manage",
  "integration:manage",
  "member:manage",
  "apikey:manage",
];

const OWNER_CAPABILITIES: OrganizationCapability[] = [
  ...ADMIN_CAPABILITIES,
  "organization:manage",
  "billing:manage",
];

const ORGANIZATION_CAPABILITY_MATRIX: Record<
  OrganizationRole,
  readonly OrganizationCapability[]
> = {
  client_viewer: CLIENT_VIEWER_CAPABILITIES,
  member: MEMBER_CAPABILITIES,
  admin: ADMIN_CAPABILITIES,
  owner: OWNER_CAPABILITIES,
};

const PLATFORM_ADMIN_CAPABILITIES: PlatformCapability[] = [
  "platform:view_organizations",
  "platform:view_costs",
  "platform:manage_spend_controls",
  "platform:verify_payments",
];

const PLATFORM_OWNER_CAPABILITIES: PlatformCapability[] = [
  ...PLATFORM_ADMIN_CAPABILITIES,
  "platform:manage_plans",
  "platform:grant_credits",
  "platform:suspend_organization",
  "platform:manage_staff",
];

const PLATFORM_CAPABILITY_MATRIX: Record<
  PlatformRole,
  readonly PlatformCapability[]
> = {
  platform_admin: PLATFORM_ADMIN_CAPABILITIES,
  platform_owner: PLATFORM_OWNER_CAPABILITIES,
};

export function organizationCapabilitiesFor(
  role: OrganizationRole,
): readonly OrganizationCapability[] {
  return ORGANIZATION_CAPABILITY_MATRIX[role];
}

export function platformCapabilitiesFor(
  role: PlatformRole | null,
): readonly PlatformCapability[] {
  return role ? PLATFORM_CAPABILITY_MATRIX[role] : [];
}

export function roleHasOrganizationCapability(
  role: OrganizationRole,
  capability: OrganizationCapability,
): boolean {
  return ORGANIZATION_CAPABILITY_MATRIX[role].includes(capability);
}

export function roleHasPlatformCapability(
  role: PlatformRole | null,
  capability: PlatformCapability,
): boolean {
  return platformCapabilitiesFor(role).includes(capability);
}

// ---------------------------------------------------------------------------
// Organization kind
// ---------------------------------------------------------------------------

/**
 * GrowwithMH's own workspace is not a customer.
 *
 * Keeping this explicit stops internal usage from polluting customer revenue,
 * churn and cost-per-customer figures, and stops GrowwithMH's own projects from
 * ever appearing in a customer-facing list. It is a classification, not a
 * permission: being the platform organization grants nothing on its own.
 */
export const ORGANIZATION_KINDS = ["platform", "customer"] as const;

export type OrganizationKind = (typeof ORGANIZATION_KINDS)[number];

export const DEFAULT_ORGANIZATION_KIND: OrganizationKind = "customer";

export function parseOrganizationKind(
  value: string | null | undefined,
): OrganizationKind {
  return value === "platform" ? "platform" : DEFAULT_ORGANIZATION_KIND;
}

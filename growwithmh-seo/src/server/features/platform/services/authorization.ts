/**
 * Central authorization. Every permission decision resolves here.
 *
 * Two rules give this module its shape.
 *
 * 1. ORGANIZATION ACCESS COMES ONLY FROM MEMBERSHIP.
 *    A platform role is never consulted when deciding whether someone may read
 *    or change a customer's project data. GrowwithMH staff can see that a
 *    workspace exists, what it spent and whether it is suspended; they cannot
 *    open its keyword lists or reports without being a member of it. Support
 *    impersonation, if it is ever built, must be an explicit, consented,
 *    audited flow — not something that falls out of a role check.
 *
 * 2. UNKNOWN MEANS DENIED.
 *    No membership row, an unrecognised role, a lookup that fails: all resolve
 *    to no access. Authorization fails closed.
 */
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { member, organizationProfiles, platformRoles } from "@/db/schema";
import { AppError } from "@/server/lib/errors";
import {
  organizationCapabilitiesFor,
  organizationRoleOutranks,
  parseOrganizationKind,
  parseOrganizationRole,
  parsePlatformRole,
  platformCapabilitiesFor,
  type OrganizationCapability,
  type OrganizationKind,
  type OrganizationRole,
  type PlatformCapability,
  type PlatformRole,
} from "@/shared/roles";

export type OrganizationAccess = {
  organizationId: string;
  role: OrganizationRole;
  capabilities: readonly OrganizationCapability[];
  kind: OrganizationKind;
};

export type PlatformAccess = {
  role: PlatformRole | null;
  capabilities: readonly PlatformCapability[];
};

/**
 * The caller's role in one organization, or null when they are not a member.
 *
 * Null is the honest answer for a non-member and callers must treat it as a
 * denial — it is never "fall back to a default role".
 */
export async function resolveOrganizationAccess(
  userId: string,
  organizationId: string,
): Promise<OrganizationAccess | null> {
  const [row] = await db
    .select({ role: member.role })
    .from(member)
    .where(
      and(eq(member.userId, userId), eq(member.organizationId, organizationId)),
    )
    .limit(1);

  if (!row) return null;

  const role = parseOrganizationRole(row.role);
  return {
    organizationId,
    role,
    capabilities: organizationCapabilitiesFor(role),
    kind: await getOrganizationKind(organizationId),
  };
}

/** The caller's GrowwithMH staff standing. Absent for every customer. */
export async function resolvePlatformAccess(
  userId: string,
): Promise<PlatformAccess> {
  const [row] = await db
    .select({ role: platformRoles.role })
    .from(platformRoles)
    .where(eq(platformRoles.userId, userId))
    .limit(1);

  const role = parsePlatformRole(row?.role);
  return { role, capabilities: platformCapabilitiesFor(role) };
}

export async function getOrganizationKind(
  organizationId: string,
): Promise<OrganizationKind> {
  const [row] = await db
    .select({ kind: organizationProfiles.kind })
    .from(organizationProfiles)
    .where(eq(organizationProfiles.organizationId, organizationId))
    .limit(1);

  // No profile row means an ordinary customer workspace. GrowwithMH's own
  // organization is the exception and must be classified explicitly.
  return parseOrganizationKind(row?.kind);
}

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

/**
 * Throws FORBIDDEN unless the caller holds `capability` in `organizationId`.
 *
 * Note what is absent: no platform-role escape hatch. That omission is the
 * tenant boundary.
 */
export async function assertOrganizationCapability(
  userId: string,
  organizationId: string,
  capability: OrganizationCapability,
): Promise<OrganizationAccess> {
  const access = await resolveOrganizationAccess(userId, organizationId);
  if (!access || !access.capabilities.includes(capability)) {
    throw new AppError("FORBIDDEN");
  }
  return access;
}

/** Throws FORBIDDEN unless the caller holds `capability` at platform level. */
export async function assertPlatformCapability(
  userId: string,
  capability: PlatformCapability,
): Promise<PlatformAccess> {
  const access = await resolvePlatformAccess(userId);
  if (!access.capabilities.includes(capability)) {
    throw new AppError("FORBIDDEN");
  }
  return access;
}

/**
 * Guards a change to another member's role.
 *
 * Two invariants, both learned the hard way in multi-tenant products:
 *   - you may not act on someone at or above your own rank, so an admin cannot
 *     demote an owner or another admin;
 *   - you may not grant a role you do not hold, so an admin cannot mint an
 *     owner and inherit billing control.
 */
export async function assertCanAssignRole(args: {
  actorUserId: string;
  organizationId: string;
  targetCurrentRole: OrganizationRole;
  targetNewRole: OrganizationRole;
}): Promise<OrganizationAccess> {
  const actor = await assertOrganizationCapability(
    args.actorUserId,
    args.organizationId,
    "member:manage",
  );

  if (!organizationRoleOutranks(actor.role, args.targetCurrentRole)) {
    throw new AppError("FORBIDDEN");
  }
  if (
    args.targetNewRole !== actor.role &&
    !organizationRoleOutranks(actor.role, args.targetNewRole)
  ) {
    throw new AppError("FORBIDDEN");
  }

  return actor;
}

/**
 * Self-demotion guard for the last owner.
 *
 * A workspace with no owner has nobody who can manage billing or transfer
 * ownership, and no in-product way back — it needs manual intervention. Cheaper
 * to refuse the change.
 */
export async function assertNotLastOwner(
  organizationId: string,
  targetUserId: string,
): Promise<void> {
  const owners = await db
    .select({ userId: member.userId })
    .from(member)
    .where(
      and(eq(member.organizationId, organizationId), eq(member.role, "owner")),
    );

  const isTargetOwner = owners.some((row) => row.userId === targetUserId);
  if (isTargetOwner && owners.length <= 1) {
    throw new AppError(
      "VALIDATION_ERROR",
      "This is the workspace's only owner. Make someone else an owner first.",
    );
  }
}

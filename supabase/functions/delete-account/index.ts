/**
 * Deletes the calling user: revokes every Composio connection, then deletes the auth user.
 * All owned rows cascade from public.users → auth.users (ON DELETE CASCADE).
 */
import { adminClient, handler, json, userContext } from '../_shared/http.ts';
import { revokeConnection } from '../_shared/composio.ts';

Deno.serve(
  handler(async (req) => {
    const { db, userId } = await userContext(req);
    const admin = adminClient();
    const { data: conns } = await db.from('social_connections').select('id');
    const ids = (conns ?? []).map((c: { id: string }) => c.id);
    if (ids.length) {
      const { data: secrets } = await admin.from('social_connection_secrets').select('composio_connected_account_id').in('connection_id', ids);
      for (const s of secrets ?? []) {
        if (s.composio_connected_account_id) await revokeConnection(s.composio_connected_account_id).catch((e) => console.error('revoke failed', e));
      }
    }
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return json({ ok: true });
  }),
);

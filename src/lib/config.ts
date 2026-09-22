import type { Backend } from './backend';
import { createLocalBackend } from './local/localBackend';
import { createRemoteBackend } from './remote/remoteBackend';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const backend: Backend = url && anon ? createRemoteBackend(url, anon) : createLocalBackend();

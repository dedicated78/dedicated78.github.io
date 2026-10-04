// Kept separate from the Markdown parser so the main bundle doesn't pull in the YAML library.

/** Normalise a website for linking (adds https:// when no scheme is present). Returns '' for unusable input. */
export function normalizeUrl(raw: string | null | undefined): string {
  const v = (raw ?? '').trim();
  if (!v) return '';
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : '';
  } catch {
    return '';
  }
}

/** Value to store for a website: keep what was typed, only add https:// when no scheme was given. */
export function cleanWebsite(raw: string | null | undefined): string {
  const v = (raw ?? '').trim();
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

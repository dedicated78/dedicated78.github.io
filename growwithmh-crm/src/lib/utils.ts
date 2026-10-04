export const cn = (...parts: (string | false | null | undefined)[]): string => parts.filter(Boolean).join(' ');

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for non-secure contexts / older browsers
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export const mapsSearchUrl = (parts: (string | null | undefined)[]): string =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.filter(Boolean).join(' '))}`;

/** One item per line / comma list → array, trimmed, no blanks. */
export const splitLines = (text: string): string[] =>
  text
    .split('\n')
    .map((l) => l.replace(/^\s*(?:[-*+]|\d{1,3}[.)])\s+/, '').trim())
    .filter(Boolean);

export const splitCommas = (text: string): string[] =>
  text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const blankToNull = (v: string | null | undefined): string | null => {
  const t = (v ?? '').trim();
  return t ? t : null;
};

/** Strip characters that would break a PostgREST `or(...)` filter or act as ilike wildcards. */
export const safeSearchTerm = (term: string): string => term.replace(/[,()%*_\\"'`]/g, ' ').replace(/\s+/g, ' ').trim();

export const sanitizeFileName = (name: string): string => {
  const base = name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
  return `${base || 'report'}.md`;
};

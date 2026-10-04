import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { splitFrontmatter } from './markdown/parser';

// Research files are internal, but still treated as untrusted: Markdown → HTML → sanitised before it touches the DOM.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer nofollow');
  }
});

export function renderMarkdown(md: string, { stripFrontmatter = true }: { stripFrontmatter?: boolean } = {}): string {
  const body = stripFrontmatter ? splitFrontmatter(md.replace(/\r\n?/g, '\n')).body : md;
  const html = marked.parse(body, { async: false, gfm: true, breaks: false }) as string;
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select', 'img', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['style', 'srcset'],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|#)/i,
  });
}

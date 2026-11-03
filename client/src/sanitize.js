// Allow-list HTML sanitizer for owner-written rich text (thank-you pages, e-mail previews) shown to respondents.
const TAGS = new Set(['b', 'strong', 'i', 'em', 'u', 's', 'p', 'br', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'hr', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'font']);
const ATTRS = { a: ['href', 'target'], img: ['src', 'alt', 'width', 'height'], font: ['color', 'size'], td: ['colspan'], th: ['colspan'] };
const SAFE_URL = /^(https?:|mailto:|tel:|#|\/)/i;
const SAFE_STYLE = /^(color|background-color|text-align|font-size|font-weight|font-style|text-decoration|margin|padding|width|max-width)$/;

export function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html');
  const clean = (node) => {
    for (const el of [...node.children]) {
      const tag = el.tagName.toLowerCase();
      if (!TAGS.has(tag)) {
        if (['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button'].includes(tag)) el.remove();
        else { clean(el); el.replaceWith(...el.childNodes); }
        continue;
      }
      for (const a of [...el.attributes]) {
        const name = a.name.toLowerCase();
        if (name === 'style') {
          const kept = a.value.split(';').map((d) => d.trim()).filter((d) => SAFE_STYLE.test(d.split(':')[0]?.trim()) && !/url\(|expression/i.test(d));
          kept.length ? el.setAttribute('style', kept.join('; ')) : el.removeAttribute('style');
        } else if (!(ATTRS[tag] || []).includes(name)) el.removeAttribute(a.name);
        else if ((name === 'href' || name === 'src') && !SAFE_URL.test(a.value.trim())) el.removeAttribute(a.name);
      }
      if (tag === 'a') { el.setAttribute('rel', 'noopener noreferrer'); if (el.getAttribute('target')) el.setAttribute('target', '_blank'); }
      clean(el);
    }
  };
  clean(doc.body.firstChild);
  return doc.body.firstChild.innerHTML;
}

export const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Plain text (older forms) becomes paragraphs; HTML passes through.
export const looksLikeHtml = (s) => /<\/?[a-z][\s\S]*>/i.test(String(s || ''));

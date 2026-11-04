// PDF generation with pdf-lib: designed submission documents and stamping e-sign documents.
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { formatValue, isInput, isEmpty } from '../shared/fields.js';
import { safeFetch } from './net.js';

// Standard fonts only cover WinAnsi; replace anything else so drawing never throws.
const MAP = { '★': '*', '✓': 'v', '✗': 'x', '—': '-', '–': '-', '…': '...', '“': '"', '”': '"', '‘': "'", '’': "'", '•': '-', '→': '->' };
export const safe = (t) => String(t ?? '').replace(/[^\x20-\x7E\xA0-\xFF\n]/g, (c) => MAP[c] ?? '?');

const hex = (h, fallback = [0.04, 0.08, 0.32]) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(h || '');
  if (!m) return rgb(...fallback);
  const n = parseInt(m[1], 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

function wrap(text, font, size, width) {
  const out = [];
  for (const para of safe(text).split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) <= width) line = test;
      else {
        if (line) out.push(line);
        // hard-break very long words
        let w = word;
        while (font.widthOfTextAtSize(w, size) > width) {
          let i = w.length;
          while (i > 1 && font.widthOfTextAtSize(w.slice(0, i), size) > width) i--;
          out.push(w.slice(0, i)); w = w.slice(i);
        }
        line = w;
      }
    }
    out.push(line);
  }
  return out;
}

async function embedImage(pdf, src) {
  try {
    let bytes, png;
    if (src.startsWith('data:')) {
      png = src.startsWith('data:image/png');
      bytes = Buffer.from(src.split(',')[1], 'base64');
    } else if (/^https?:\/\//.test(src)) {
      const r = await safeFetch(src, { allowHttp: true, timeoutMs: 5000, maxBytes: 10 * 1024 * 1024 }).catch(() => null);
      if (!r?.ok) return null;
      bytes = Buffer.from(await r.arrayBuffer());
      png = (r.headers.get('content-type') || '').includes('png') || src.toLowerCase().endsWith('.png');
    } else return null;
    return png ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
  } catch {
    return null;
  }
}

export async function submissionPdf(form, sub) {
  const def = form.definition;
  const tpl = { title: '{form_title}', intro: '', footer: '', showEmpty: false, includeMeta: true, color: def.theme?.primary, logo: def.theme?.logo, ...(def.pdf || {}) };
  const pdf = await PDFDocument.create();
  pdf.setTitle(safe(`${form.title} #${sub.id}`));
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 595, H = 842, M = 48, LABEL_W = 170, VAL_X = M + LABEL_W + 12, VAL_W = W - VAL_X - M;
  const accent = hex(tpl.color);
  let page, y;
  const newPage = () => { page = pdf.addPage([W, H]); y = H - M; };
  const ensure = (h) => { if (y - h < M + 30) newPage(); };
  const fill = (t) => safe(t).replace(/\{form_title\}/g, safe(form.title)).replace(/\{submission_id\}/g, String(sub.id)).replace(/\{date\}/g, sub.created_at);

  newPage();
  // Header band
  page.drawRectangle({ x: 0, y: H - 92, width: W, height: 92, color: accent });
  let titleX = M;
  if (tpl.logo) {
    const img = await embedImage(pdf, tpl.logo);
    if (img) {
      const s = Math.min(56 / img.height, 120 / img.width);
      page.drawImage(img, { x: M, y: H - 74, width: img.width * s, height: img.height * s });
      titleX = M + img.width * s + 14;
    }
  }
  page.drawText(fill(tpl.title).slice(0, 70), { x: titleX, y: H - 54, size: 20, font: bold, color: rgb(1, 1, 1) });
  y = H - 120;
  if (tpl.includeMeta) {
    page.drawText(safe(`Submission #${sub.id}  ·  ${sub.created_at} UTC${sub.approval ? `  ·  Approval: ${sub.approval}` : ''}`), { x: M, y, size: 9, font, color: rgb(0.4, 0.42, 0.5) });
    y -= 22;
  }
  if (tpl.intro) {
    for (const line of wrap(fill(tpl.intro), font, 11, W - 2 * M)) { ensure(16); page.drawText(line, { x: M, y, size: 11, font }); y -= 15; }
    y -= 8;
  }

  for (const f of def.fields) {
    if (f.type === 'heading' && f.label && def.fields.indexOf(f) > 0) {
      ensure(30);
      y -= 6;
      page.drawText(safe(f.label).slice(0, 80), { x: M, y, size: 13, font: bold, color: accent });
      y -= 8;
      page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.6, color: accent });
      y -= 14;
      continue;
    }
    if (!isInput(f) || ['captcha', 'hidden'].includes(f.type)) continue;
    const v = sub.data[f.id];
    if (isEmpty(v) && !tpl.showEmpty) continue;
    const labelLines = wrap(f.label, bold, 10, LABEL_W);
    if (f.type === 'signature' && v) {
      const img = await embedImage(pdf, v);
      const h = 70;
      ensure(h + 10);
      labelLines.forEach((l, i) => page.drawText(l, { x: M, y: y - i * 13, size: 10, font: bold, color: rgb(0.3, 0.32, 0.4) }));
      if (img) {
        const s = Math.min(h / img.height, VAL_W / img.width);
        page.drawImage(img, { x: VAL_X, y: y - img.height * s + 8, width: img.width * s, height: img.height * s });
        y -= Math.max(img.height * s, labelLines.length * 13) + 12;
      } else { page.drawText('[signed]', { x: VAL_X, y, size: 10, font }); y -= 20; }
      continue;
    }
    let text = isEmpty(v) ? '-' : formatValue(f, v);
    if (f.type === 'matrix' && v) text = Object.entries(v).map(([r, c]) => `${r}: ${c}`).join('\n');
    if (f.type === 'products' && v) text = (v.items || []).map((i) => `${i.name} x ${i.qty}  =  ${v.currency} ${(i.price * i.qty).toFixed(2)}`).join('\n') + `\nTotal: ${v.currency} ${Number(v.total).toFixed(2)}`;
    if (f.type === 'file' && v) text = (Array.isArray(v) ? v : [v]).map((x) => `${x.name} (${Math.round((x.size || 0) / 1024)} KB)`).join('\n');
    const lines = wrap(text, font, 10, VAL_W);
    const h = Math.max(lines.length, labelLines.length) * 13 + 8;
    ensure(h);
    labelLines.forEach((l, i) => page.drawText(l, { x: M, y: y - i * 13, size: 10, font: bold, color: rgb(0.3, 0.32, 0.4) }));
    lines.forEach((l, i) => page.drawText(l, { x: VAL_X, y: y - i * 13, size: 10, font, color: rgb(0.1, 0.12, 0.18) }));
    y -= h;
    page.drawLine({ start: { x: M, y: y + 4 }, end: { x: W - M, y: y + 4 }, thickness: 0.3, color: rgb(0.88, 0.89, 0.92) });
  }

  if (sub.payment) {
    ensure(40);
    y -= 8;
    page.drawText(safe(`Payment: ${sub.payment.status} - ${sub.payment.currency} ${Number(sub.payment.amount).toFixed(2)} (${sub.payment.provider}${sub.payment.ref ? `, ref ${sub.payment.ref}` : ''})`), { x: M, y, size: 10, font: bold });
    y -= 18;
  }

  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    const foot = fill(tpl.footer || '');
    if (foot) p.drawText(foot.slice(0, 110), { x: M, y: 24, size: 8, font, color: rgb(0.5, 0.52, 0.6) });
    p.drawText(`Page ${i + 1} of ${pages.length}`, { x: W - M - 60, y: 24, size: 8, font, color: rgb(0.5, 0.52, 0.6) });
  });
  return pdf.save();
}

/**
 * Stamps signer values onto the original PDF and appends an audit-trail page.
 * fields: [{id, type, page, x, y, w, h, signer}] with x/y/w/h as fractions of the page (top-left origin).
 */
export async function stampSignedPdf(originalBytes, doc, fields, signers) {
  const pdf = await PDFDocument.load(originalBytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pages = pdf.getPages();
  for (const f of fields) {
    const signer = signers[f.signer];
    const v = signer?.values?.[f.id];
    const p = pages[f.page];
    if (!p || v === undefined || v === '' || v === false) continue;
    const { width: PW, height: PH } = p.getSize();
    const x = f.x * PW, w = f.w * PW, h = f.h * PH, y = PH - f.y * PH - h;
    if (f.type === 'signature' || f.type === 'initials') {
      const img = await embedImage(pdf, v);
      if (img) {
        const s = Math.min(w / img.width, h / img.height);
        p.drawImage(img, { x, y: y + (h - img.height * s) / 2, width: img.width * s, height: img.height * s });
      }
    } else if (f.type === 'checkbox') {
      p.drawText('X', { x: x + 2, y: y + 2, size: Math.min(h, 14), font: bold });
    } else {
      const size = Math.max(7, Math.min(12, h * 0.7));
      p.drawText(safe(v).slice(0, 200), { x: x + 2, y: y + (h - size) / 2 + 1, size, font, color: rgb(0.05, 0.1, 0.35), maxWidth: w - 4 });
    }
  }
  // Audit trail
  const page = pdf.addPage([595, 842]);
  let y = 790;
  page.drawText('Signature Certificate', { x: 48, y, size: 18, font: bold }); y -= 26;
  page.drawText(safe(`Document: ${doc.title}  (ID ${doc.id})`), { x: 48, y, size: 10, font }); y -= 14;
  page.drawText(safe(`Completed: ${new Date().toISOString()}`), { x: 48, y, size: 10, font }); y -= 26;
  for (const s of signers) {
    page.drawText(safe(`${s.name} <${s.email}>`), { x: 48, y, size: 11, font: bold }); y -= 14;
    page.drawText(safe(`Viewed: ${s.viewed_at || '-'}   Signed: ${s.signed_at || '-'}   IP: ${s.ip || '-'}`), { x: 60, y, size: 9, font }); y -= 22;
  }
  page.drawText('Signed electronically via WpForms by GlixWordpress.', { x: 48, y: 60, size: 8, font, color: rgb(0.5, 0.5, 0.55) });
  return pdf.save();
}

// Safe handling of user-uploaded files. Types come from the file's bytes, never from the uploader's claim,
// and only images and PDFs are ever shown in the browser; everything else downloads, sandboxed.
import fs from 'node:fs';

const SIGNATURES = [
  ['image/png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  ['image/jpeg', [0xff, 0xd8, 0xff]],
  ['image/gif', [0x47, 0x49, 0x46, 0x38]],
  ['application/pdf', [0x25, 0x50, 0x44, 0x46, 0x2d]],
];
const INLINE = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf']);

export function sniffType(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const head = Buffer.alloc(16);
  try { fs.readSync(fd, head, 0, 16, 0); } finally { fs.closeSync(fd); }
  for (const [type, sig] of SIGNATURES) if (sig.every((b, i) => head[i] === b)) return type;
  if (head.toString('latin1', 0, 4) === 'RIFF' && head.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  return 'application/octet-stream';
}

// Multer decodes multipart filenames as Latin-1; browsers send UTF-8 ("आवेदन.pdf" arrived as "à¤†à¤µ…").
export function fixUploadName(name) {
  const raw = String(name || 'file');
  const utf8 = Buffer.from(raw, 'latin1').toString('utf8');
  return (utf8.includes('\uFFFD') ? raw : utf8).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 200);
}

// Headers for serving an upload: sniffed type, inline only for images/PDFs, never sniffable as HTML.
export function sendUpload(res, filePath, name, { download = false } = {}) {
  const type = sniffType(filePath);
  const inline = !download && INLINE.has(type);
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '');
  res.setHeader('Content-Type', inline ? type : 'application/octet-stream');
  res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // PDFs need the browser viewer; everything else gets a script-free sandbox.
  res.setHeader('Content-Security-Policy', type === 'application/pdf' ? "default-src 'none'; object-src 'self'; plugin-types application/pdf" : "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox");
  res.setHeader('Cache-Control', 'private, no-store');
  fs.createReadStream(filePath).pipe(res);
}

// Hourly clean-up: uploads never attached to a submission (24 h), abandoned drafts (30 days), expired sessions.
export function sweep(db, uploadDir) {
  const orphans = db.prepare("SELECT id FROM uploads WHERE pending = 1 AND created_at < datetime('now', '-1 day')").all();
  for (const { id } of orphans) {
    fs.rmSync(`${uploadDir}/${id.replace(/[^\w]/g, '')}`, { force: true });
    db.prepare('DELETE FROM uploads WHERE id = ?').run(id);
  }
  db.prepare("DELETE FROM drafts WHERE updated_at < datetime('now', '-30 days')").run();
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
  return orphans.length;
}

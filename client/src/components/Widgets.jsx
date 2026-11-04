// Renderers for `widget` fields. One component per kind; see shared/widgets.js for the catalog.
import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { api } from '../api.js';
import { WIDGET_BY_KEY, widgetKind, datasetOptions } from '@shared/widgets.js';
import { PHONE_CODES } from '@shared/datasets.js';
import { safeUrl } from '@shared/urls.js';

const lines = (x) => (Array.isArray(x) ? x : String(x || '').split('\n')).map((s) => String(s).trim()).filter(Boolean);
const Placeholder = ({ children }) => <div className="wg-empty">{children}</div>;

// ── Embeds ──
function embedSrc(provider, url) {
  const u = String(url || '').trim();
  if (!u) return '';
  const pick = (re) => u.match(re)?.[1];
  switch (provider) {
    case 'youtube': { const id = pick(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{6,})/); return id ? `https://www.youtube-nocookie.com/embed/${id}` : ''; }
    case 'vimeo': { const id = pick(/vimeo\.com\/(?:video\/|event\/)?(\d+)/); return id ? `https://player.vimeo.com/video/${id}` : ''; }
    case 'loom': { const id = pick(/loom\.com\/(?:share|embed)\/(\w+)/); return id ? `https://www.loom.com/embed/${id}` : ''; }
    case 'spotify': { const m = u.match(/open\.spotify\.com\/(track|album|playlist|episode|show)\/(\w+)/); return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : ''; }
    case 'soundcloud': return /soundcloud\.com\//.test(u) ? `https://w.soundcloud.com/player/?url=${encodeURIComponent(u)}` : '';
    case 'dailymotion': { const id = pick(/(?:dailymotion\.com\/video\/|dai\.ly\/)(\w+)/); return id ? `https://www.dailymotion.com/embed/video/${id}` : ''; }
    case 'tiktok': { const id = pick(/video\/(\d+)/); return id ? `https://www.tiktok.com/embed/v2/${id}` : ''; }
    case 'facebook': return /facebook\.com\//.test(u) ? `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(u)}` : '';
    case 'map': return `https://maps.google.com/maps?q=${encodeURIComponent(u)}&output=embed`;
    default: return /^https:\/\//.test(u) ? u : '';
  }
}

function Embed({ f }) {
  if (f.provider === 'audio') return f.url ? <audio controls src={f.url} style={{ width: '100%' }} /> : <Placeholder>Add an audio file URL in the widget settings.</Placeholder>;
  const src = embedSrc(f.provider, f.url);
  if (!src) return <Placeholder>Add a valid {WIDGET_BY_KEY[f.widget]?.label} link in the widget settings.</Placeholder>;
  return <iframe className="wg-embed" src={src} title={f.label || 'Embedded content'} style={{ height: Number(f.height) || 360 }} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" />;
}

// ── Display blocks ──
function Countdown({ f }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const target = f.date ? new Date(f.date).getTime() : NaN;
  if (!Number.isFinite(target)) return <Placeholder>Set the countdown date in the widget settings.</Placeholder>;
  const s = Math.max(0, Math.floor((target - now) / 1000));
  const parts = [[Math.floor(s / 86400), 'days'], [Math.floor((s % 86400) / 3600), 'hours'], [Math.floor((s % 3600) / 60), 'min'], [s % 60, 'sec']];
  return (
    <div className="wg-countdown" role="timer">
      {f.text && <div className="wf-desc" style={{ marginTop: 0 }}>{f.text}</div>}
      <div className="row" style={{ gap: 10 }}>{parts.map(([n, l]) => <div key={l} className="wg-count"><b>{String(n).padStart(2, '0')}</b><span>{l}</span></div>)}</div>
    </div>
  );
}

function Clock({ f }) {
  const [now, setNow] = useState(new Date());
  const [start, setStart] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 500); return () => clearInterval(t); }, []);
  if (f.mode === 'stopwatch') {
    const ms = elapsed + (start ? now - start : 0);
    const s = Math.floor(ms / 1000);
    return (
      <div className="row">
        <span className="wg-clock">{String(Math.floor(s / 60)).padStart(2, '0')}:{String(s % 60).padStart(2, '0')}</span>
        <button type="button" onClick={() => { if (start) { setElapsed(ms); setStart(null); } else setStart(new Date()); }}>{start ? 'Pause' : 'Start'}</button>
        <button type="button" onClick={() => { setStart(null); setElapsed(0); }}>Reset</button>
      </div>
    );
  }
  let text;
  try { text = now.toLocaleTimeString(undefined, f.timezone ? { timeZone: f.timezone } : {}); } catch { text = now.toLocaleTimeString(); }
  return <div><span className="wg-clock">{text}</span>{f.timezone && <div className="wf-desc">{f.timezone}</div>}</div>;
}

function Compare({ f }) {
  const [pos, setPos] = useState(50);
  if (!f.before || !f.after) return <Placeholder>Add the “before” and “after” image URLs in the widget settings.</Placeholder>;
  return (
    <div className="wg-compare" style={{ height: Number(f.height) || 300 }}>
      <img src={f.after} alt="After" />
      <div className="wg-compare-before" style={{ width: `${pos}%` }}><img src={f.before} alt="Before" /></div>
      <div className="wg-compare-handle" style={{ left: `${pos}%` }} aria-hidden="true">⇔</div>
      <input type="range" min="0" max="100" value={pos} onChange={(e) => setPos(Number(e.target.value))} aria-label="Compare before and after" />
    </div>
  );
}

function Qr({ f }) {
  const [src, setSrc] = useState('');
  useEffect(() => { if (f.text) QRCode.toDataURL(String(f.text), { margin: 1, width: Number(f.size) || 180 }).then(setSrc).catch(() => setSrc('')); }, [f.text, f.size]);
  return f.text ? <img src={src} alt={`QR code for ${f.text}`} width={Number(f.size) || 180} height={Number(f.size) || 180} /> : <Placeholder>Add QR content in the widget settings.</Placeholder>;
}

function ActionButton({ f }) {
  const [done, setDone] = useState('');
  const digits = String(f.value || '').replace(/[^\d]/g, '');
  const msg = encodeURIComponent(f.message || '');
  const link = { whatsapp: `https://wa.me/${digits}${msg ? `?text=${msg}` : ''}`, call: `tel:${f.value}`, sms: `sms:${f.value}${msg ? `?body=${msg}` : ''}`, link: f.value }[f.network];
  if (link && safeUrl(link)) return <a className="btn wg-action" href={safeUrl(link)} target={f.network === 'link' || f.network === 'whatsapp' ? '_blank' : undefined} rel="noreferrer">{f.text || f.label}</a>;
  const act = async () => {
    if (f.network === 'top') return window.scrollTo({ top: 0, behavior: 'smooth' });
    if (f.network === 'share') {
      const url = f.value || window.location.href;
      if (navigator.share) return navigator.share({ url, title: document.title }).catch(() => {});
      await navigator.clipboard?.writeText(url); return setDone('Link copied');
    }
    if (f.network === 'copy') { await navigator.clipboard?.writeText(String(f.value || '')); setDone('Copied'); }
  };
  return <span className="row"><button type="button" className="wg-action" onClick={act}>{f.text || f.label}</button>{done && <span className="hint" role="status">{done}</span>}</span>;
}

function CalendarLinks({ f }) {
  if (!f.start) return <Placeholder>Set the event start time in the widget settings.</Placeholder>;
  const z = (d) => new Date(d).toISOString().replace(/[-:]|\.\d{3}/g, '');
  const end = f.end || new Date(new Date(f.start).getTime() + 3600000).toISOString();
  const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(f.text || '')}&dates=${z(f.start)}/${z(end)}&location=${encodeURIComponent(f.location || '')}`;
  const ics = `data:text/calendar;charset=utf-8,${encodeURIComponent(`BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${z(f.start)}\nDTEND:${z(end)}\nSUMMARY:${f.text || ''}\nLOCATION:${f.location || ''}\nEND:VEVENT\nEND:VCALENDAR`)}`;
  return <div className="row wrap"><a className="btn wg-action" href={google} target="_blank" rel="noreferrer">Add to Google Calendar</a><a className="btn" href={ics} download="event.ics">Download .ics</a></div>;
}

export function WidgetDisplay({ f }) {
  switch (widgetKind(f)) {
    case 'embed': return <Embed f={f} />;
    case 'heading': return <div className={`wg-heading ${f.animated ? 'animated' : ''}`} style={{ fontSize: Number(f.size) || 32, textAlign: f.align || 'left' }}>{f.text}</div>;
    case 'text': return <div style={{ whiteSpace: 'pre-wrap' }}>{f.text}</div>;
    case 'highlight': return <div className="wg-highlight" style={{ background: f.color || '#fef08a' }}>{f.text}</div>;
    case 'spoiler': return <details className="wg-spoiler"><summary>{f.title || 'Show'}</summary><div style={{ whiteSpace: 'pre-wrap' }}>{f.text}</div></details>;
    case 'spacer': return <div style={{ height: Number(f.height) || 32 }} aria-hidden="true" />;
    case 'separator': return <hr style={{ border: 0, borderTop: `2px ${f.style || 'solid'} ${f.color || '#e4e4e7'}`, margin: '8px 0' }} />;
    case 'gallery': {
      const imgs = lines(f.images);
      if (!imgs.length) return <Placeholder>Add image URLs in the widget settings.</Placeholder>;
      return <div className={f.slide ? 'wg-slider' : 'wg-gallery'}>{imgs.map((src, i) => <img key={i} src={src} alt={`Image ${i + 1}`} style={{ height: Number(f.height) || 160 }} loading="lazy" />)}</div>;
    }
    case 'compare': return <Compare f={f} />;
    case 'qr': return <Qr f={f} />;
    case 'countdown': return <Countdown f={f} />;
    case 'clock': return <Clock f={f} />;
    case 'quotes': return <div className="stack">{lines(f.items).map((q, i) => { const [text, by] = q.split(' — '); return <blockquote key={i} className="wg-quote">“{text}”{by && <cite>— {by}</cite>}</blockquote>; })}</div>;
    case 'button': return <ActionButton f={f} />;
    case 'calendar': return <CalendarLinks f={f} />;
    case 'ticker': return <div className="wg-ticker" aria-label={f.text}><span>{f.text}</span></div>;
    default: return null;
  }
}

// ── Inputs ──
function ChoiceWidget({ f, value, onChange }) {
  const [extra, setExtra] = useState([]);
  const [adding, setAdding] = useState('');
  const [query, setQuery] = useState('');
  const opts = [...lines(f.options), ...extra];
  const multi = !!f.multi;
  const list = multi ? (Array.isArray(value) ? value : []) : value;
  const isOn = (o) => (multi ? list.includes(o) : value === o);
  const toggle = (o) => (multi ? onChange(list.includes(o) ? list.filter((x) => x !== o) : [...list, o]) : onChange(o));
  const addOwn = () => { const v = adding.trim(); if (!v) return; if (!opts.includes(v)) setExtra([...extra, v]); setAdding(''); multi ? onChange([...list, v]) : onChange(v); };
  const shown = f.searchable && query ? opts.filter((o) => o.toLowerCase().includes(query.toLowerCase())) : opts;
  const imgs = lines(f.images);
  const descs = lines(f.descriptions);
  const kind = widgetKind(f);

  let body;
  if (f.dropdown && !multi && !f.searchable) {
    body = (
      <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Please select</option>
        {opts.map((o) => <option key={o}>{o}</option>)}
      </select>
    );
  } else if (kind === 'imageChoice') {
    body = (
      <div className="wg-images">
        {opts.map((o, i) => (
          <button type="button" key={o} className={`wg-image ${isOn(o) ? 'on' : ''}`} aria-pressed={isOn(o)} onClick={() => toggle(o)}>
            {imgs[i] ? <img src={imgs[i]} alt="" /> : <span className="wg-image-ph" aria-hidden="true">{o.slice(0, 1)}</span>}
            <span>{o}</span>
          </button>
        ))}
      </div>
    );
  } else if (f.style === 'buttons') {
    body = <div className="wf-seg wrap" role={multi ? 'group' : 'radiogroup'}>{opts.map((o) => <button type="button" key={o} className={isOn(o) ? 'on' : ''} aria-pressed={isOn(o)} onClick={() => toggle(o)}>{o}</button>)}</div>;
  } else {
    body = (
      <div className={`wf-choices wg-style-${f.style || 'cards'} ${f.dropdown ? 'wg-scroll' : ''}`}>
        {f.searchable && <input type="search" placeholder="Search…" aria-label="Search options" value={query} onChange={(e) => setQuery(e.target.value)} />}
        {multi && f.selectAll && (
          <label><input type="checkbox" checked={opts.length > 0 && opts.every((o) => list.includes(o))} onChange={(e) => onChange(e.target.checked ? [...opts] : [])} /> <b>Select all</b></label>
        )}
        {shown.map((o) => {
          const i = opts.indexOf(o);
          return (
            <label key={o}>
              <input type={multi ? 'checkbox' : 'radio'} name={f.id} checked={isOn(o)} onChange={() => toggle(o)} />
              <span>{o}{kind === 'described' && descs[i] && <span className="wf-desc" style={{ display: 'block', marginTop: 2 }}>{descs[i]}</span>}</span>
            </label>
          );
        })}
      </div>
    );
  }
  return (
    <div>
      {multi && f.dropdown && list.length > 0 && <div className="row wrap" style={{ marginBottom: 8 }}>{list.map((o) => <span key={o} className="wg-chip">{o}<button type="button" aria-label={`Remove ${o}`} onClick={() => toggle(o)}>×</button></span>)}</div>}
      {body}
      {f.allowAdd && (
        <div className="row" style={{ marginTop: 8 }}>
          <input value={adding} placeholder="Add your own option" aria-label="Add your own option" onChange={(e) => setAdding(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOwn(); } }} />
          <button type="button" onClick={addOwn}>Add</button>
        </div>
      )}
    </div>
  );
}

function ListWidget({ f, value, onChange }) {
  const cols = f.columns?.length ? f.columns : [{ label: 'Value', type: 'text' }];
  const rows = Array.isArray(value) && value.length ? value : Array.from({ length: Math.max(1, Number(f.minRows) || 1) }, () => cols.map(() => ''));
  const set = (r, c, v) => onChange(rows.map((row, i) => (i === r ? row.map((x, j) => (j === c ? v : x)) : row)));
  const max = Number(f.maxRows) || 50;
  return (
    <div className="wg-list">
      <div className="table-scroll" style={{ maxHeight: 'none' }}>
        <table className="tbl">
          <thead><tr>{cols.map((c, i) => <th key={i}>{c.label}</th>)}<th><span className="sr-only">Remove</span></th></tr></thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                {cols.map((c, ci) => (
                  <td key={ci}>
                    {c.type === 'dropdown'
                      ? <select aria-label={`${c.label} row ${r + 1}`} value={row[ci] || ''} onChange={(e) => set(r, ci, e.target.value)}><option value="">Please select</option>{lines(c.options).map((o) => <option key={o}>{o}</option>)}</select>
                      : <input aria-label={`${c.label} row ${r + 1}`} type={{ number: 'number', date: 'date', time: 'time' }[c.type] || 'text'} value={row[ci] || ''} onChange={(e) => set(r, ci, e.target.value)} />}
                  </td>
                ))}
                <td><button type="button" className="icon-btn ghost" aria-label={`Remove row ${r + 1}`} disabled={rows.length <= (Number(f.minRows) || 1)} onClick={() => onChange(rows.filter((_, i) => i !== r))}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="small" style={{ marginTop: 8 }} disabled={rows.length >= max} onClick={() => onChange([...rows, cols.map(() => '')])}>+ Add row</button>
    </div>
  );
}

function RankWidget({ f, value, onChange }) {
  const items = Array.isArray(value) && value.length ? value : lines(f.options);
  useEffect(() => { if (!Array.isArray(value) || !value.length) onChange(lines(f.options)); }, [f.options]);
  const move = (i, d) => { const n = [...items]; [n[i], n[i + d]] = [n[i + d], n[i]]; onChange(n); };
  return (
    <ol className="wg-rank">
      {items.map((o, i) => (
        <li key={o}>
          <span className="wg-rank-n">{i + 1}</span><span className="grow">{o}</span>
          <button type="button" className="icon-btn ghost" aria-label={`Move ${o} up`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
          <button type="button" className="icon-btn ghost" aria-label={`Move ${o} down`} disabled={i === items.length - 1} onClick={() => move(i, 1)}>↓</button>
        </li>
      ))}
    </ol>
  );
}

function TagsWidget({ f, value, onChange }) {
  const [t, setT] = useState('');
  const tags = Array.isArray(value) ? value : [];
  const add = () => { const v = t.trim().replace(/,$/, ''); if (v && !tags.includes(v)) onChange([...tags, v]); setT(''); };
  return (
    <div className="wg-tags">
      {tags.map((x) => <span key={x} className="wg-chip">{x}<button type="button" aria-label={`Remove ${x}`} onClick={() => onChange(tags.filter((y) => y !== x))}>×</button></span>)}
      <input value={t} placeholder="Type and press Enter" aria-label="Add a tag" onChange={(e) => setT(e.target.value)} onBlur={add} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }} />
    </div>
  );
}

function CharBoxes({ f, value, onChange }) {
  const n = Math.max(1, Math.min(12, Number(f.length) || 6));
  const refs = useRef([]);
  const chars = String(value || '').padEnd(n, ' ').slice(0, n).split('');
  const set = (i, c) => {
    const next = [...chars]; next[i] = c || ' ';
    onChange(next.join('').trimEnd());
    if (c && i < n - 1) refs.current[i + 1]?.focus();
  };
  return (
    <div className="row">
      {chars.map((c, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el; }} className="wg-charbox" maxLength={1} inputMode={f.numeric ? 'numeric' : 'text'} aria-label={`Character ${i + 1} of ${n}`} value={c.trim()}
          onChange={(e) => { const v = e.target.value.slice(-1); if (f.numeric && v && !/\d/.test(v)) return; set(i, v); }}
          onKeyDown={(e) => { if (e.key === 'Backspace' && !chars[i].trim() && i > 0) refs.current[i - 1]?.focus(); }} />
      ))}
    </div>
  );
}

function Capture({ f, value, onChange, formId, mode }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [rec, setRec] = useState(null);
  const [preview, setPreview] = useState('');
  const files = Array.isArray(value) ? value : [];
  const upload = async (file) => {
    setErr('');
    if (file.size > (Number(f.maxSizeMb) || 10) * 1024 * 1024) return setErr(`File exceeds ${f.maxSizeMb} MB.`);
    if (file.type.startsWith('image/')) setPreview(URL.createObjectURL(file));
    if (mode !== 'live') return onChange([{ id: 'preview', name: file.name, size: file.size, mime: file.type }]);
    const fd = new FormData(); fd.append('field', f.id); fd.append('file', file);
    setBusy(true);
    try { onChange([await api(`/public/forms/${formId}/upload`, { method: 'POST', form: fd })]); } catch (x) { setErr(x.message); }
    setBusy(false);
  };
  const record = async () => {
    if (rec) { rec.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(f.capture === 'video' ? { video: true, audio: true } : { audio: true });
      const mr = new MediaRecorder(stream);
      const chunks = [];
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop()); setRec(null);
        const blob = new Blob(chunks, { type: mr.mimeType });
        upload(new File([blob], `${f.capture}-${Date.now()}.${f.capture === 'video' ? 'webm' : 'webm'}`, { type: mr.mimeType }));
      };
      mr.start(); setRec(mr);
    } catch { setErr('Recording is not available. Allow microphone/camera access or upload a file instead.'); }
  };
  const accept = { photo: 'image/*', image: 'image/*', video: 'video/*', audio: 'audio/*', clipboard: 'image/*' }[f.capture];
  return (
    <div className="stack">
      {f.capture === 'clipboard' ? (
        <div className="wg-paste" tabIndex={0} role="button" aria-label="Paste an image here" onPaste={(e) => { const it = [...e.clipboardData.items].find((x) => x.type.startsWith('image/')); if (it) upload(it.getAsFile()); }}>
          Click here and press Ctrl+V / ⌘V to paste an image
        </div>
      ) : (
        <div className="row wrap">
          {(f.capture === 'audio' || f.capture === 'video') && typeof MediaRecorder !== 'undefined' && (
            <button type="button" className={rec ? 'danger' : ''} onClick={record}>{rec ? '■ Stop recording' : `● Record ${f.capture}`}</button>
          )}
          <label className="btn">
            {f.capture === 'photo' ? 'Take or choose a photo' : 'Choose a file'}
            <input type="file" className="sr-only" accept={accept} capture={f.capture === 'photo' ? 'environment' : f.capture === 'video' ? 'user' : undefined} onChange={(e) => { const file = e.target.files[0]; e.target.value = ''; if (file) upload(file); }} />
          </label>
        </div>
      )}
      {busy && <div className="hint">Uploading…</div>}
      {err && <div className="wf-err">{err}</div>}
      {preview && <img src={preview} alt="Preview" className="wg-preview" />}
      {files.map((x, i) => <div key={i} className="row hint">{x.name} <button type="button" className="link small" onClick={() => { onChange([]); setPreview(''); }}>remove</button></div>)}
    </div>
  );
}

function Drawing({ f, value, onChange }) {
  const ref = useRef(null);
  const drawing = useRef(false);
  useEffect(() => {
    const c = ref.current;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio; c.height = c.offsetHeight * ratio;
    const ctx = c.getContext('2d');
    ctx.scale(ratio, ratio); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = '#dc2626';
    const src = value || f.background;
    if (src) { const img = new Image(); img.crossOrigin = 'anonymous'; img.onload = () => ctx.drawImage(img, 0, 0, c.offsetWidth, c.offsetHeight); img.src = src; }
  }, []);
  const pos = (e) => { const r = ref.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const save = () => { try { onChange(ref.current.toDataURL('image/png')); } catch { /* cross-origin background: keep strokes local */ } };
  return (
    <div className="wf-sig">
      <canvas ref={ref} style={{ height: 260, maxWidth: '100%' }} aria-label="Drawing area"
        onPointerDown={(e) => { drawing.current = true; const ctx = ref.current.getContext('2d'); ctx.beginPath(); ctx.moveTo(...pos(e)); ref.current.setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => { if (!drawing.current) return; const ctx = ref.current.getContext('2d'); ctx.lineTo(...pos(e)); ctx.stroke(); }}
        onPointerUp={() => { if (drawing.current) { drawing.current = false; save(); } }} />
      <div><button type="button" className="link small" onClick={() => { const c = ref.current; c.getContext('2d').clearRect(0, 0, c.width, c.height); onChange(''); }}>Clear</button></div>
    </div>
  );
}

function Location({ f, value, onChange }) {
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const locate = () => {
    if (!navigator.geolocation) return setErr('Location is not available in this browser.');
    setBusy(true); setErr('');
    navigator.geolocation.getCurrentPosition(
      (p) => { setBusy(false); onChange({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Math.round(p.coords.accuracy) }); },
      () => { setBusy(false); setErr('We could not get your location. Allow location access and try again.'); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };
  useEffect(() => { if (f.auto && !value) locate(); }, []);
  return (
    <div className="stack">
      <div className="row wrap">
        <button type="button" onClick={locate} disabled={busy}>{busy ? 'Locating…' : value ? 'Update my location' : 'Use my current location'}</button>
        {value?.lat != null && <span className="hint mono">{value.lat.toFixed(5)}, {value.lng.toFixed(5)} (±{value.accuracy} m)</span>}
      </div>
      {err && <div className="wf-err">{err}</div>}
      {f.map && value?.lat != null && <iframe className="wg-embed" title="Map of your location" style={{ height: 220 }} src={`https://maps.google.com/maps?q=${value.lat},${value.lng}&z=15&output=embed`} loading="lazy" />}
    </div>
  );
}

function IdPin({ f, value, onChange, formId, mode }) {
  const v = value || {};
  const [msg, setMsg] = useState('');
  const needPin = f.mode !== 'Employee ID only';
  const verify = async () => {
    setMsg('');
    try {
      let res;
      if (mode === 'live') res = await api(`/public/forms/${formId}/verify-id`, { method: 'POST', body: { field: f.id, id: v.id, pin: v.pin } });
      else {
        const hit = (f.roster || []).find((r) => String(r.id).trim().toLowerCase() === String(v.id || '').trim().toLowerCase() && (!needPin || String(r.pin || '') === String(v.pin || '')));
        res = hit ? { ok: true, name: hit.name } : { ok: false };
      }
      if (res.ok) { onChange({ ...v, verified: true, name: res.name }); setMsg(`Verified${res.name ? `: ${res.name}` : ''}`); } else { onChange({ ...v, verified: false }); setMsg('ID or PIN not recognised.'); }
    } catch (e) { setMsg(e.message); }
  };
  return (
    <div className="stack">
      <div className="row wrap" style={{ alignItems: 'flex-end' }}>
        <label style={{ flex: '2 1 180px' }}><span className="wf-desc" style={{ display: 'block', margin: '0 0 4px' }}>Employee ID</span><input value={v.id || ''} onChange={(e) => onChange({ ...v, id: e.target.value, verified: false })} /></label>
        {needPin && <label style={{ flex: '1 1 100px' }}><span className="wf-desc" style={{ display: 'block', margin: '0 0 4px' }}>PIN</span><input type="password" inputMode="numeric" autoComplete="off" value={v.pin || ''} onChange={(e) => onChange({ ...v, pin: e.target.value, verified: false })} /></label>}
        <button type="button" className="wf-btn" style={{ minHeight: 48 }} onClick={verify}>Verify</button>
      </div>
      {msg && <div role="status" className={v.verified ? 'ok' : 'wf-err'}>{msg}</div>}
    </div>
  );
}

function Cascade({ f, value, onChange }) {
  const map = useMemo(() => Object.fromEntries(lines(f.map).map((l) => { const [p, rest = ''] = l.split(':'); return [p.trim(), rest.split(',').map((x) => x.trim()).filter(Boolean)]; })), [f.map]);
  const v = value || {};
  return (
    <div className="grid2">
      <label><span className="wf-desc" style={{ display: 'block', margin: '0 0 4px' }}>{f.parentLabel || 'Category'}</span>
        <select value={v.parent || ''} onChange={(e) => onChange({ parent: e.target.value, child: '' })}><option value="">Please select</option>{Object.keys(map).map((p) => <option key={p}>{p}</option>)}</select>
      </label>
      <label><span className="wf-desc" style={{ display: 'block', margin: '0 0 4px' }}>{f.childLabel || 'Option'}</span>
        <select value={v.child || ''} disabled={!v.parent} onChange={(e) => onChange({ ...v, child: e.target.value })}><option value="">Please select</option>{(map[v.parent] || []).map((c) => <option key={c}>{c}</option>)}</select>
      </label>
    </div>
  );
}

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD', 'JPY'];

export function WidgetInput({ f, value, onChange, formId, mode, computed }) {
  const v = value ?? '';
  const obj = value || {};
  switch (widgetKind(f)) {
    case 'choice': case 'imageChoice': case 'described': return <ChoiceWidget f={f} value={value} onChange={onChange} />;
    case 'preset':
      return <select value={v} onChange={(e) => onChange(e.target.value)}><option value="">Please select</option>{datasetOptions(f).map((o) => <option key={o}>{o}</option>)}</select>;
    case 'validated': case 'masked': case 'confirm':
      return <input className={f.large ? 'wg-large' : ''} value={v} placeholder={f.placeholder || f.mask || ''} autoComplete="off" onChange={(e) => onChange(e.target.value)} />;
    case 'calc': return <input readOnly value={computed === '' || computed == null ? '-' : String(computed)} style={{ background: '#f4f4f5', maxWidth: f.calc === 'words_inr' ? '100%' : 260 }} aria-live="polite" />;
    case 'capture': return <Capture f={f} value={value} onChange={onChange} formId={formId} mode={mode} />;
    case 'drawing': return <Drawing f={f} value={value} onChange={onChange} />;
    case 'location': return <Location f={f} value={value} onChange={onChange} />;
    case 'list': return <ListWidget f={f} value={value} onChange={onChange} />;
    case 'multitext':
      return <div className="stack">{lines(f.labels).map((l) => <label key={l} style={{ display: 'block' }}><span className="wf-desc" style={{ display: 'block', margin: '0 0 4px' }}>{l}</span><input value={obj[l] || ''} onChange={(e) => onChange({ ...obj, [l]: e.target.value })} /></label>)}</div>;
    case 'tags': return <TagsWidget f={f} value={value} onChange={onChange} />;
    case 'rank': return <RankWidget f={f} value={value} onChange={onChange} />;
    case 'toggle':
      return (
        <button type="button" role="switch" aria-checked={!!value} className={`wg-switch ${value ? 'on' : ''}`} onClick={() => onChange(!value)}>
          <span className="wg-knob" aria-hidden="true" />{value ? f.onLabel || 'Yes' : f.offLabel || 'No'}
        </button>
      );
    case 'range': {
      const r = { from: obj.from ?? f.min ?? 0, to: obj.to ?? f.max ?? 100 };
      return (
        <div className="grid2">
          <label><span className="wf-desc" style={{ display: 'block', margin: '0 0 4px' }}>From</span><input type="number" min={f.min} max={f.max} step={f.step} value={r.from} onChange={(e) => onChange({ ...r, from: Number(e.target.value) })} /></label>
          <label><span className="wf-desc" style={{ display: 'block', margin: '0 0 4px' }}>To</span><input type="number" min={f.min} max={f.max} step={f.step} value={r.to} onChange={(e) => onChange({ ...r, to: Number(e.target.value) })} /></label>
        </div>
      );
    }
    case 'slider':
      return (
        <div>
          <div className="row"><input type="range" min={f.min} max={f.max} step={f.step} value={v === '' ? f.min : v} onChange={(e) => onChange(Number(e.target.value))} style={{ border: 0, minHeight: 0, padding: 0 }} /><b style={{ minWidth: 44 }}>{v === '' ? '-' : v}</b></div>
          {(f.leftLabel || f.rightLabel) && <div className="row hint" style={{ justifyContent: 'space-between' }}><span>{f.leftLabel}</span><span>{f.rightLabel}</span></div>}
        </div>
      );
    case 'stepper': {
      const n = v === '' ? Number(f.min) || 0 : Number(v);
      const step = Number(f.step) || 1;
      const clamp = (x) => Math.min(f.max === '' || f.max == null ? Infinity : Number(f.max), Math.max(f.min === '' || f.min == null ? -Infinity : Number(f.min), x));
      return (
        <div className="wg-stepper">
          <button type="button" aria-label="Decrease" onClick={() => onChange(clamp(n - step))}>−</button>
          <input type="number" value={v} aria-label={f.label} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} />
          <button type="button" aria-label="Increase" onClick={() => onChange(clamp(n + step))}>+</button>
        </div>
      );
    }
    case 'charboxes': return <CharBoxes f={f} value={value} onChange={onChange} />;
    case 'textcounter':
      return (
        <div>
          <textarea rows={f.autosize ? Math.max(Number(f.rows) || 3, String(v).split('\n').length) : Number(f.rows) || 4} value={v} maxLength={f.maxLength || undefined} onChange={(e) => onChange(e.target.value)} style={f.mono ? { fontFamily: "'Geist Mono', monospace", fontSize: 14 } : undefined} spellCheck={!f.mono} />
          <div className="hint" style={{ textAlign: 'right' }} aria-live="polite">{String(v).length}{f.maxLength ? ` / ${f.maxLength}` : ''} characters</div>
        </div>
      );
    case 'daterange':
      return (
        <div className="grid2">
          <label><span className="wf-desc" style={{ display: 'block', margin: '0 0 4px' }}>{f.fromLabel || 'From'}</span><input type="date" value={obj.from || ''} onChange={(e) => onChange({ ...obj, from: e.target.value })} /></label>
          <label><span className="wf-desc" style={{ display: 'block', margin: '0 0 4px' }}>{f.toLabel || 'To'}</span><input type="date" min={obj.from || undefined} value={obj.to || ''} onChange={(e) => onChange({ ...obj, to: e.target.value })} /></label>
        </div>
      );
    case 'plain': return <input type={f.input || 'text'} value={v} onChange={(e) => onChange(e.target.value)} style={f.input === 'color' ? { maxWidth: 120, padding: 4 } : { maxWidth: 280 }} />;
    case 'currencyAmount':
      return (
        <div className="row">
          <select style={{ maxWidth: 110 }} aria-label="Currency" value={obj.currency || f.currency || 'INR'} onChange={(e) => onChange({ ...obj, currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
          <input type="number" min="0" step="0.01" aria-label="Amount" value={obj.amount ?? ''} onChange={(e) => onChange({ currency: obj.currency || f.currency || 'INR', amount: e.target.value })} />
        </div>
      );
    case 'ratingComment':
      return (
        <div className="stack">
          <div className="wf-stars">{Array.from({ length: Number(f.stars) || 5 }, (_, i) => <button type="button" key={i} className={Number(obj.rating) > i ? 'on' : ''} onClick={() => onChange({ ...obj, rating: i + 1 })} aria-label={`${i + 1} stars`}>★</button>)}</div>
          <textarea rows={2} placeholder="Add a comment (optional)" aria-label="Comment" value={obj.comment || ''} onChange={(e) => onChange({ ...obj, comment: e.target.value })} />
        </div>
      );
    case 'likert': {
      const pts = Math.max(3, Math.min(11, Number(f.points) || 7));
      return (
        <div>
          <div className="wf-scale" role="radiogroup">{Array.from({ length: pts }, (_, i) => i + 1).map((n) => <button type="button" key={n} role="radio" aria-checked={Number(v) === n} className={Number(v) === n ? 'on' : ''} onClick={() => onChange(n)}>{n}</button>)}</div>
          <div className="row hint" style={{ justifyContent: 'space-between', maxWidth: 50 * pts }}><span>{f.leftLabel}</span><span>{f.rightLabel}</span></div>
        </div>
      );
    }
    case 'phoneIntl': {
      const m = String(v).match(/^(\+\d+)\s*(.*)$/);
      const code = m ? m[1] : f.code || '+91';
      const rest = m ? m[2] : String(v);
      return (
        <div className="row">
          <select style={{ maxWidth: 150 }} aria-label="Country code" value={code} onChange={(e) => onChange(`${e.target.value} ${rest}`)}>{PHONE_CODES.map(([c, n]) => <option key={c + n} value={c}>{c} {n}</option>)}</select>
          <input type="tel" inputMode="tel" aria-label="Phone number" value={rest} onChange={(e) => onChange(`${code} ${e.target.value}`)} />
        </div>
      );
    }
    case 'autocomplete':
      return <><input list={`dl-${f.id}`} value={v} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} /><datalist id={`dl-${f.id}`}>{lines(f.options).map((o) => <option key={o} value={o} />)}</datalist></>;
    case 'cascade': return <Cascade f={f} value={value} onChange={onChange} />;
    case 'idpin': return <IdPin f={f} value={value} onChange={onChange} formId={formId} mode={mode} />;
    case 'termsScroll':
      return (
        <div className="stack">
          <div className="wg-terms" tabIndex={0}>{f.terms}</div>
          <label className="row" style={{ fontWeight: 400 }}><input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} /> {f.text}</label>
        </div>
      );
    // Only seen in the builder: these are filled automatically and hidden from respondents.
    case 'uniqueId': return <div className="hint">Generated when the form is submitted, e.g. <code>{f.prefix}{'1'.padStart(Number(f.digits) || 5, '0')}</code></div>;
    case 'meta': return <div className="hint">Captured automatically ({{ url: 'form page URL', referrer: 'referring page', useragent: 'browser', timestamp: 'time the form was opened', random: 'random value' }[f.source]}). Not shown to respondents.</div>;
    default: return <div className="hint">This widget is not available.</div>;
  }
}

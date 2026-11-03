// Small rich-text editor for e-mail bodies and thank-you pages: formatting toolbar, field tokens, HTML source view.
import { useEffect, useRef, useState } from 'react';
import { sanitizeHtml } from '../sanitize.js';

const exec = (cmd, arg) => document.execCommand(cmd, false, arg);

export default function RichText({ value, onChange, fields = [], minHeight = 260, label = 'Message' }) {
  const ref = useRef(null);
  const [source, setSource] = useState(false);
  // Only push outside changes into the editor, so typing doesn't reset the caret.
  useEffect(() => {
    if (!source && ref.current && ref.current.innerHTML !== (value || '')) ref.current.innerHTML = sanitizeHtml(value || '');
  }, [value, source]);
  const emit = () => onChange(ref.current.innerHTML);
  const run = (cmd, arg) => { ref.current.focus(); exec(cmd, arg); emit(); };
  const insertToken = (id) => {
    if (!id) return;
    if (source) return onChange(`${value || ''}{${id}}`);
    ref.current.focus();
    exec('insertText', `{${id}}`);
    emit();
  };
  const tools = [
    ['bold', 'B', 'Bold', { fontWeight: 700 }], ['italic', 'I', 'Italic', { fontStyle: 'italic' }], ['underline', 'U', 'Underline', { textDecoration: 'underline' }],
  ];
  return (
    <div className="rte">
      <div className="rte-bar" role="toolbar" aria-label={`${label} formatting`}>
        <select aria-label="Text style" defaultValue="" onChange={(e) => { run('formatBlock', e.target.value); e.target.value = ''; }}>
          <option value="" disabled>Style</option>
          <option value="p">Paragraph</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option>
        </select>
        {tools.map(([cmd, glyph, name, style]) => <button key={cmd} type="button" aria-label={name} title={name} onMouseDown={(e) => e.preventDefault()} onClick={() => run(cmd)} style={style} disabled={source}>{glyph}</button>)}
        <input type="color" aria-label="Text colour" title="Text colour" onChange={(e) => run('foreColor', e.target.value)} disabled={source} />
        <button type="button" aria-label="Bulleted list" title="Bulleted list" onMouseDown={(e) => e.preventDefault()} onClick={() => run('insertUnorderedList')} disabled={source}>••</button>
        <button type="button" aria-label="Align centre" title="Align centre" onMouseDown={(e) => e.preventDefault()} onClick={() => run('justifyCenter')} disabled={source}>≡</button>
        <button type="button" aria-label="Insert link" title="Insert link" onMouseDown={(e) => e.preventDefault()} onClick={() => { const u = prompt('Link URL (https://…)'); if (u && /^(https?:|mailto:)/.test(u)) run('createLink', u); }} disabled={source}>🔗</button>
        <button type="button" aria-label="Insert image" title="Insert image" onMouseDown={(e) => e.preventDefault()} onClick={() => { const u = prompt('Image URL (https://…)'); if (u && /^https:/.test(u)) run('insertImage', u); }} disabled={source}>▣</button>
        <select aria-label="Insert a field" value="" onChange={(e) => insertToken(e.target.value)}>
          <option value="">Fields ▾</option>
          <option value="form_title">Form title</option>
          <option value="all_fields">All answers (table)</option>
          {fields.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
        <button type="button" className={`right ${source ? 'on' : ''}`} aria-pressed={source} onClick={() => setSource(!source)} title="Edit HTML">&lt;/&gt;</button>
      </div>
      {source
        ? <textarea className="rte-source" aria-label={`${label} HTML`} value={value || ''} onChange={(e) => onChange(e.target.value)} style={{ minHeight }} />
        : <div ref={ref} className="rte-body" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label={label} onInput={emit} onBlur={emit} style={{ minHeight }} />}
    </div>
  );
}

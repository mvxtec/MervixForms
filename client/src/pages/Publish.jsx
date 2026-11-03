import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { api, fmtDate } from '../api.js';

function Copy({ text }) {
  const [ok, setOk] = useState(false);
  return <button className="small" onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1200); }}>{ok ? 'Copied ✓' : 'Copy'}</button>;
}

export default function Publish({ id, def }) {
  const url = `${window.location.origin}/f/${id}`;
  const embedUrl = `${window.location.origin}/embed/${id}`;
  const [qr, setQr] = useState('');
  const [log, setLog] = useState([]);
  useEffect(() => { QRCode.toDataURL(url, { width: 220, margin: 1 }).then(setQr); api(`/forms/${id}/webhooks`).then(setLog).catch(() => {}); }, [url]);

  const iframe = `<iframe src="${embedUrl}" title="${def.title.replace(/"/g, '')}" style="width:100%;min-height:700px;border:0"></iframe>`;
  const script = `<div id="wpf-${id}"></div>\n<script>(function(){var f=document.createElement('iframe');f.src='${embedUrl}';f.style.cssText='width:100%;border:0;min-height:700px';document.getElementById('wpf-${id}').appendChild(f);})();</script>`;
  const popup = `<a href="${url}" onclick="window.open(this.href,'form','width=760,height=800');return false;">${def.title}</a>`;
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(def, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `${def.title}.json`; a.click();
  };

  const block = (title, code, hint) => (
    <div className="panel">
      <div className="row"><h3 style={{ margin: 0 }}>{title}</h3><span className="right"><Copy text={code} /></span></div>
      {hint && <p className="hint">{hint}</p>}
      <pre>{code}</pre>
    </div>
  );

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="panel">
        <h2>Share link</h2>
        <div className="row"><input readOnly value={url} onFocus={(e) => e.target.select()} /><Copy text={url} /><a className="btn" href={url} target="_blank" rel="noreferrer">Open</a></div>
        <p className="hint">Prefill fields with URL parameters: <code>{url}?{def.fields.find((f) => f.type === 'email')?.id || 'fieldId'}=value</code></p>
        <div className="row" style={{ marginTop: 12, alignItems: 'flex-start' }}>
          {qr && <img src={qr} alt="QR code" width={160} />}
          <div>
            <b>QR code</b>
            <p className="hint">Print it or put it on a poster. </p>
            {qr && <a className="btn small" href={qr} download={`${def.title}-qr.png`}>Download PNG</a>}
          </div>
        </div>
      </div>
      {block('Embed (iframe)', iframe, 'Paste into any website, WordPress HTML block, Wix, Squarespace, etc.')}
      {block('Embed (script)', script)}
      {block('Popup link', popup)}
      <div className="panel">
        <h3>Export / import</h3>
        <button onClick={exportJson}>Export form JSON</button>
        <span className="hint" style={{ marginLeft: 8 }}>Import it from My Forms → Create Form → Import.</span>
      </div>
      <div className="panel">
        <h3>REST API</h3>
        <p className="hint">Create an API key under <a href="#/account/api">Account → API</a>, then:</p>
        <pre>{`curl -H "APIKEY: <key>" ${window.location.origin}/api/forms/${id}/submissions\ncurl -H "APIKEY: <key>" ${window.location.origin}/api/forms/${id}/submissions.csv`}</pre>
      </div>
      {!!log.length && (
        <div className="panel">
          <h3>Recent webhook deliveries</h3>
          <table className="tbl"><tbody>{log.map((l) => <tr key={l.id}><td className="hint">{fmtDate(l.created_at)}</td><td>{l.url}</td><td>{l.status ? <span className={`pill ${l.status < 300 ? 'green' : 'red'}`}>{l.status}</span> : <span className="pill red">{l.error}</span>}</td></tr>)}</tbody></table>
        </div>
      )}
    </div>
  );
}

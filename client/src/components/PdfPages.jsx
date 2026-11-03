import { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

function Page({ pdf, index, width, children }) {
  const canvas = useRef(null);
  const [size, setSize] = useState({ w: width, h: width * 1.414 });
  useEffect(() => {
    let task;
    pdf.getPage(index + 1).then((page) => {
      const base = page.getViewport({ scale: 1 });
      const scale = width / base.width;
      const vp = page.getViewport({ scale: scale * (window.devicePixelRatio || 1) });
      const c = canvas.current;
      c.width = vp.width; c.height = vp.height;
      setSize({ w: width, h: base.height * scale });
      task = page.render({ canvasContext: c.getContext('2d'), viewport: vp });
    });
    return () => task?.cancel();
  }, [pdf, index, width]);
  return (
    <div style={{ position: 'relative', width: size.w, height: size.h, margin: '0 auto 16px', boxShadow: '0 1px 4px rgba(0,0,0,.15)', background: '#fff' }} data-page={index}>
      <canvas ref={canvas} style={{ width: size.w, height: size.h, display: 'block' }} />
      {children?.(index, size)}
    </div>
  );
}

/** Renders every page of a PDF. `overlay(pageIndex, {w, h})` draws positioned content above each page. */
export default function PdfPages({ url, width = 760, overlay }) {
  const [pdf, setPdf] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setPdf(null);
    const task = pdfjs.getDocument({ url, withCredentials: true });
    task.promise.then(setPdf).catch((e) => setError(e.message));
    return () => { task.destroy(); };
  }, [url]);
  if (error) return <div className="error">Could not load PDF: {error}</div>;
  if (!pdf) return <div className="muted">Loading document…</div>;
  return <div>{Array.from({ length: pdf.numPages }, (_, i) => <Page key={i} pdf={pdf} index={i} width={width}>{overlay}</Page>)}</div>;
}

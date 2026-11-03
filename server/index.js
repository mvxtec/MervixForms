import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Minimal .env loader (no dependency).
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const { default: account } = await import('./routes/account.js');
const { default: forms } = await import('./routes/forms.js');
const { default: submissions } = await import('./routes/submissions.js');
const { default: publicRoutes } = await import('./routes/public.js');
const { default: ai } = await import('./routes/ai.js');
const { default: sign } = await import('./routes/sign.js');
const { default: apps } = await import('./routes/apps.js');
const { default: workflows } = await import('./routes/workflows.js');
const { default: oauth } = await import('./routes/oauth.js');
const { default: workspace } = await import('./routes/workspace.js');
const { startScheduler } = await import('./workflows.js');
startScheduler();

// Async route handlers must never take the process down.
process.on('unhandledRejection', (e) => console.error('unhandledRejection', e));

export const app = express();
app.set('trust proxy', 'loopback');
app.use(express.json({ limit: '15mb' }));

app.use('/api/public', publicRoutes);
// Routers with public endpoints go before the routers that require auth for every request.
app.use('/api', ai);
app.use('/api', sign);
app.use('/api', apps);
app.use('/api', workflows);
app.use('/api', oauth);
app.use('/api', workspace);
app.use('/api', account);
app.use('/api', forms);
app.use('/api', submissions);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

// Serve the built client (npm run build). /f/:id is the public form route.
const dist = path.join(root, 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(['/', '/f/:id', '/embed/:id', '/a/:id'], (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 4000;
  app.listen(port, () => console.log(`WpForms server on http://localhost:${port}`));
}

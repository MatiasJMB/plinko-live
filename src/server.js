// server.js — Entrypoint. Un único proceso Node que:
//   (a) sirve el overlay estático (módulo http nativo, sin framework),
//   (b) expone un WebSocketServer en /events para empujar eventos al overlay,
//   (c) arranca el simulador (modo dev) o el conector real de TikTok (modo live).
//
// Modo: SIM si process.env.SIM === '1' o si NO hay TIKTOK_USERNAME.
// Arranque:  node --env-file=.env src/server.js   (o `npm run sim`).

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

import { makeBridge } from './wsBridge.js';
import { attachKeyboard, handleSimRequest } from './simulator.js';

const PORT = Number(process.env.PORT) || 8080;
const PUBLIC_DIR = fileURLToPath(new URL('../public/', import.meta.url));
const SIM = process.env.SIM === '1' || !process.env.TIKTOK_USERNAME;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

const server = http.createServer(async (req, res) => {
  // Endpoint de simulación (solo en modo SIM).
  if (req.method === 'POST' && req.url === '/sim') {
    if (!SIM) return res.writeHead(403).end('sim disabled');
    return handleSimRequest(req, res, bridge);
  }
  if (req.method !== 'GET') return res.writeHead(405).end('method not allowed');

  // Servidor de estáticos con protección anti path-traversal.
  let pathname = decodeURIComponent(req.url.split('?')[0]);
  if (pathname === '/') pathname = '/index.html';
  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(PUBLIC_DIR, safe);
  if (!filePath.startsWith(PUBLIC_DIR)) return res.writeHead(403).end('forbidden');

  try {
    const buf = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(buf);
  } catch {
    res.writeHead(404).end('not found');
  }
});

// WebSocket: el overlay se conecta a ws://host:PORT/events.
const wss = new WebSocketServer({ server, path: '/events' });
const bridge = makeBridge(wss);

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'system', msg: 'overlay conectado', ts: Date.now() }));
});

server.listen(PORT, () => {
  console.log(`\n  ▸ Overlay:   http://localhost:${PORT}/`);
  console.log(`  ▸ WebSocket: ws://localhost:${PORT}/events`);
  console.log(`  ▸ Modo:      ${SIM ? 'SIMULADOR (dev)' : 'TikTok LIVE (real)'}\n`);

  if (SIM) {
    attachKeyboard(bridge);
  } else {
    startLive();
  }
});

// El conector real se importa de forma DINÁMICA: así el modo simulador nunca carga
// tiktok-live-connector (ni su dependencia `got`, que pide Node ≥22). Menos RAM en dev
// y desarrollo 100% independiente del paquete.
async function startLive() {
  try {
    const { startConnector } = await import('./tiktokConnector.js');
    startConnector({
      username: process.env.TIKTOK_USERNAME,
      signApiKey: process.env.EULER_API_KEY || undefined,
      onEvent: (event) => bridge.broadcast(event),
    });
  } catch (err) {
    console.error('[live] no se pudo iniciar el conector de TikTok:', err?.message);
    console.error('[live] revisa TIKTOK_USERNAME / EULER_API_KEY, o usa `npm run sim`.');
  }
}

process.on('SIGINT', () => {
  console.log('\nApagando…');
  process.exit(0);
});

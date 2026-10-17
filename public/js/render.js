// render.js — Dibujo del canvas (fondo transparente para OBS). Panel del tablero,
// triángulo de clavos, paredes en V, celdas con color por valor (destello al puntuar),
// y canicas con relieve + avatar + estela + glow + escudo + aro de jefe.

import { CONFIG } from './config.js';
import { eachMarble } from './marblePool.js';
import { getAvatar, drawAvatar } from './avatars.js';

let ctx;
const popups = []; // { x, y, text, color, born, life }
const flashes = new Map(); // binIndex -> bornTime

export function initRender(canvas) {
  ctx = canvas.getContext('2d');
}

export function addScorePopup(x, y, value, tier) {
  popups.push({
    x,
    y,
    text: '+' + value,
    color: CONFIG.tierColors[tier] ?? '#fff',
    born: performance.now(),
    life: 1300,
  });
  if (popups.length > 80) popups.splice(0, popups.length - 80);
}

export function flashBin(index) {
  flashes.set(index, performance.now());
}

export function render(board) {
  const now = performance.now();
  ctx.clearRect(0, 0, board.width, board.height);
  drawPanel(board);
  drawWalls(board);
  drawPegs(board);
  drawBins(board, now);
  drawMarbles(board);
  drawPopups(now);
}

// --- Tablero ---------------------------------------------------------------

function drawPanel(board) {
  const pad = board.pinSpacing * 0.6;
  const x = board.bins[0].x0 - pad;
  const w = board.bins[board.bins.length - 1].x1 + pad - x;
  const y = board.spawn.y - pad;
  const h = board.binBottom + pad - y;
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, 'rgba(16,20,34,0.55)');
  g.addColorStop(1, 'rgba(8,10,18,0.66)');
  roundRect(x, y, w, h, 20);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawWalls(board) {
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (const w of board.walls) {
    ctx.beginPath();
    ctx.moveTo(w.x1, w.y1);
    ctx.lineTo(w.x2, w.y2);
    ctx.stroke();
  }
}

function drawPegs(board) {
  for (const p of board.pegs) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = '#e8eef7';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }
}

function drawBins(board, now) {
  for (const bin of board.bins) {
    const col = binColor(bin.value);
    const x = bin.x0 + 2;
    const w = bin.x1 - bin.x0 - 4;
    const top = board.goalLineY;
    const h = board.binBottom - top;

    // Relleno degradado por valor
    const g = ctx.createLinearGradient(0, top, 0, top + h);
    g.addColorStop(0, hexToRgba(col, 0.08));
    g.addColorStop(1, hexToRgba(col, 0.32));
    ctx.fillStyle = g;
    ctx.fillRect(x, top, w, h);

    // Destello al recibir una canica
    const flashAt = flashes.get(bin.index);
    if (flashAt != null) {
      const t = (now - flashAt) / 450;
      if (t >= 1) flashes.delete(bin.index);
      else {
        ctx.fillStyle = hexToRgba(col, 0.55 * (1 - t));
        ctx.fillRect(x, top, w, h);
      }
    }

    // Valor
    ctx.fillStyle = col;
    ctx.font = `800 ${Math.round(board.pinSpacing * 0.34)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(bin.value), bin.cx, top + h * 0.5);
  }
}

// --- Canicas ---------------------------------------------------------------

function drawMarbles(board) {
  eachMarble((m) => {
    const b = m.body;
    const r = m.radius;
    const color = CONFIG.tierColors[m.tier] ?? '#fff';

    // Estela
    if (m.trail) {
      m.trailPoints.push({ x: b.position.x, y: b.position.y });
      if (m.trailPoints.length > 14) m.trailPoints.shift();
      ctx.strokeStyle = m.trail === 'gold' ? 'rgba(255,209,102,0.5)' : hexToRgba(color, 0.4);
      ctx.lineWidth = r * 0.7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < m.trailPoints.length; i++) {
        const pt = m.trailPoints[i];
        i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }

    // Sombra de contacto
    ctx.beginPath();
    ctx.arc(b.position.x, b.position.y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.shadowColor = m.glow ? (m.trail === 'gold' ? '#ffd166' : color) : 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = m.glow ? r * 1.3 : 5;
    ctx.shadowOffsetY = m.glow ? 0 : 2;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Avatar recortado
    drawAvatar(ctx, getAvatar(m.userId, m.avatarUrl), m.userId, m.nickname, b.position.x, b.position.y, r);

    // Brillo (highlight) arriba-izquierda para dar volumen
    ctx.beginPath();
    ctx.arc(b.position.x - r * 0.3, b.position.y - r * 0.32, r * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fill();

    // Borde por tier
    ctx.lineWidth = Math.max(2, r * 0.16);
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(b.position.x, b.position.y, r, 0, Math.PI * 2);
    ctx.stroke();

    // Escudo
    if (m.shield) {
      ctx.strokeStyle = 'rgba(120,220,255,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.position.x, b.position.y, r + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Aro de jefe pulsante
    if (m.boss) {
      const pulse = 4 + Math.sin(performance.now() / 120) * 3;
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(b.position.x, b.position.y, r + pulse + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Nombre (más prominente a mayor tier)
    if (m.tier >= 1 || r > board.marbleRadius * 1.05) {
      const fs = Math.max(10, Math.round(r * 0.62));
      ctx.font = `${m.tier >= 3 ? '800 ' : '600 '}${fs}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const label = m.nickname || m.username;
      const ty = b.position.y + r + 3;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.strokeText(label, b.position.x, ty);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, b.position.x, ty);
    }
  });
}

function drawPopups(now) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = popups.length - 1; i >= 0; i--) {
    const p = popups[i];
    const t = (now - p.born) / p.life;
    if (t >= 1) {
      popups.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = 1 - t;
    ctx.font = '800 24px system-ui, sans-serif';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.65)';
    ctx.strokeText(p.text, p.x, p.y - t * 46);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y - t * 46);
    ctx.globalAlpha = 1;
  }
}

// --- Utilidades ------------------------------------------------------------

function binColor(value) {
  if (value >= 1000) return '#ff3b6b';
  if (value >= 400) return '#ff8c42';
  if (value >= 150) return '#ffd166';
  if (value >= 50) return '#4cc9f0';
  if (value >= 25) return '#5a9fd4';
  return '#8a98ac';
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

function hexToRgba(hex, a) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

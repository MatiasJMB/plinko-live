// avatars.js — Caché LRU de imágenes de avatar (acotada para no fugar RAM en Lives
// largos) + dibujo. Si no hay URL o la imagen falla, dibuja un círculo con la
// inicial del nick y un color derivado del userId (cero red → ideal para el simulador).

const MAX_AVATARS = 40;
const cache = new Map(); // userId -> { img, loaded, failed, lastUsed }

export function getAvatar(userId, url) {
  let entry = cache.get(userId);
  if (!entry) {
    entry = { img: null, loaded: false, failed: !url };
    if (url) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        entry.img = img;
        entry.loaded = true;
      };
      img.onerror = () => {
        entry.failed = true;
      };
      img.src = url;
    }
    cache.set(userId, entry);
    trim();
  }
  entry.lastUsed = performance.now();
  return entry;
}

function trim() {
  if (cache.size <= MAX_AVATARS) return;
  let oldestKey = null;
  let oldest = Infinity;
  for (const [k, v] of cache) {
    if (v.lastUsed < oldest) {
      oldest = v.lastUsed;
      oldestKey = k;
    }
  }
  if (oldestKey) cache.delete(oldestKey);
}

export function colorFor(userId) {
  let h = 0;
  const s = String(userId);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return `hsl(${h}, 70%, 55%)`;
}

// Dibuja el avatar recortado en un círculo de radio r centrado en (x,y).
export function drawAvatar(ctx, entry, userId, nickname, x, y, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (entry?.loaded && entry.img) {
    ctx.drawImage(entry.img, x - r, y - r, r * 2, r * 2);
  } else {
    ctx.fillStyle = colorFor(userId);
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    const initial = (nickname || '?').trim().charAt(0).toUpperCase() || '?';
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.round(r * 1.1)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initial, x, y + 1);
  }
  ctx.restore();
}

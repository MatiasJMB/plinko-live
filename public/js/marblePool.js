// marblePool.js — Object pool de canicas. Cada canica tiene un id único (un mismo
// donante puede tener varias en vuelo: cada donación lanza canica → más incentivo a
// donar). Nunca hay más de CONFIG.maxMarbles cuerpos vivos: al llegar al techo se
// despawnea la más antigua (backpressure). Los cuerpos Matter se RECICLAN (reset de
// posición y escala) para no presionar al GC en Lives largos.

import { CONFIG } from './config.js';
import { createMarbleBody } from './marble.js';
import { addBody, removeBody } from './physics.js';

const active = new Map(); // marbleId -> marble
const freeBodies = []; // cuerpos Matter reciclados
let nextId = 1;

export function activeCount() {
  return active.size;
}
export function eachMarble(fn) {
  for (const m of active.values()) fn(m);
}

export function spawnMarble(world, board, identity) {
  if (active.size >= CONFIG.maxMarbles) despawnOldest(world);

  const r = CONFIG.marbleRadius;
  const x = pickSpawnX(board, r); // busca un hueco: evita nacer SOLAPADA (causa explosión)
  const y = board.spawn.y;

  let body = freeBodies.pop();
  if (body) resetBody(body, x, y);
  else body = createMarbleBody(x, y, r);
  addBody(world, body);
  // Empuje inicial: caída clara (no y≈0, que dejaba a la siguiente nacer encima) +
  // pizca lateral para romper la simetría sobre la punta.
  window.Matter.Body.setVelocity(body, { x: (Math.random() - 0.5) * 0.6, y: CONFIG.dropSpeed });

  const id = nextId++;
  const marble = {
    id,
    userId: identity.userId,
    username: identity.username,
    nickname: identity.nickname,
    avatarUrl: identity.avatarUrl,
    tier: identity.tier,
    multiplier: identity.multiplier ?? 1,
    powers: identity.powers ?? [],
    body,
    radius: r,
    scored: false,
    score: 0,
    landedBin: -1,
    // estado de poderes (lo rellena powers.applyPowers)
    magnet: 0,
    pierceCharges: 0,
    shield: false,
    trail: null,
    glow: false,
    boss: false,
    boostKind: null,
    trailPoints: [],
    born: performance.now(),
  };
  active.set(id, marble);
  return marble;
}

// Elige una x en la franja de entrada que NO solape con otra canica aún en la zona
// alta. Prueba varios candidatos y usa el primero con hueco ≥ 1 diámetro; si ninguno
// (ráfaga densa), devuelve el más despejado — el clamp de velocidad hace de red.
function pickSpawnX(board, r) {
  const { xMin, xMax, y } = board.spawn;
  let bestX = xMin + Math.random() * (xMax - xMin);
  let bestGap = -Infinity;
  for (let attempt = 0; attempt < 6; attempt++) {
    const cx = xMin + Math.random() * (xMax - xMin);
    let gap = Infinity;
    for (const m of active.values()) {
      const p = m.body && m.body.position;
      if (!p || p.y > y + r * 3) continue; // solo las que siguen en la zona de entrada
      gap = Math.min(gap, Math.hypot(cx - p.x, y - p.y));
    }
    if (gap >= 2 * r) return cx;
    if (gap > bestGap) { bestGap = gap; bestX = cx; }
  }
  return bestX;
}

export function despawnMarble(world, id) {
  const m = active.get(id);
  if (!m) return;
  removeBody(world, m.body);
  active.delete(id);
  recycle(m.body);
  m.body = null;
}

export function endRound(world) {
  for (const id of [...active.keys()]) despawnMarble(world, id);
}

function despawnOldest(world) {
  let oldestId = null;
  let oldest = Infinity;
  for (const [id, m] of active) {
    if (m.born < oldest) {
      oldest = m.born;
      oldestId = id;
    }
  }
  if (oldestId != null) despawnMarble(world, oldestId);
}

function recycle(body) {
  if (freeBodies.length >= CONFIG.maxMarbles) return; // suelta al GC si el pool está lleno
  resetScaleToBase(body);
  freeBodies.push(body);
}

function resetBody(body, x, y) {
  const M = window.Matter;
  resetScaleToBase(body);
  M.Body.setPosition(body, { x, y });
  M.Body.setVelocity(body, { x: 0, y: 0 });
  M.Body.setAngularVelocity(body, 0);
  M.Sleeping.set(body, false);
}

function resetScaleToBase(body) {
  const M = window.Matter;
  const cur = body.circleRadius || CONFIG.marbleRadius;
  const s = CONFIG.marbleRadius / cur;
  if (Math.abs(s - 1) > 0.01) M.Body.scale(body, s, s);
}

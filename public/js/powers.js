// powers.js — Traduce los "powers" de cada tier en efectos concretos sobre la canica.
// Es lo que hace que donar más SE SIENTA distinto y gratificante (rosa ≠ galaxia).
//   boost (T1): turbo | escudo | tamaño (aleatorio)
//   magnet (T2+): atracción hacia el centro/jackpot
//   second (T2): segunda canica (la dispara roundManager)
//   trail/trailGold: estela de color / dorada
//   pierce/pierceAll: ignora 1 / todos los rebotes-trampa
//   legendary (T3): glow + tamaño jefe
//   boss (T4): enorme + escudo + intro a pantalla completa (lo dispara hud)

import { CONFIG } from './config.js';

const M = () => window.Matter;

export function applyPowers(marble) {
  const powers = marble.powers || [];

  if (powers.includes('boost')) {
    const pick = ['turbo', 'shield', 'size'][Math.floor(Math.random() * 3)];
    marble.boostKind = pick;
    if (pick === 'turbo') M().Body.setVelocity(marble.body, { x: Math.random() * 4 - 2, y: 7 });
    if (pick === 'shield') marble.shield = true;
    if (pick === 'size') scaleMarble(marble, 1.35);
  }

  if (powers.includes('magnet')) marble.magnet = marble.tier >= 3 ? 0.0016 : 0.0008;
  if (powers.includes('trail')) marble.trail = marble.trail || 'color';
  if (powers.includes('trailGold')) marble.trail = 'gold';
  if (powers.includes('pierce')) marble.pierceCharges = 1;
  if (powers.includes('pierceAll')) marble.pierceCharges = Infinity;

  if (powers.includes('boss')) {
    marble.boss = true;
    marble.glow = true;
    marble.shield = true;
    marble.trail = 'gold';
    scaleMarble(marble, 2.3);
  } else if (powers.includes('legendary')) {
    marble.glow = true;
    scaleMarble(marble, 1.5);
  }
}

// Escala el cuerpo (y el radio lógico) a `factor` × radio base, sin acumular errores.
export function scaleMarble(marble, factor) {
  const cur = marble.body.circleRadius || CONFIG.marbleRadius;
  const target = CONFIG.marbleRadius * factor;
  const s = target / cur;
  if (Math.abs(s - 1) > 0.01) M().Body.scale(marble.body, s, s);
  marble.radius = target;
}

// Llamado cada frame: empuja la canica con imán hacia el centro (bins de jackpot).
export function tickMagnet(marble, centerX) {
  if (!marble.magnet || marble.scored) return;
  const b = marble.body;
  const dx = centerX - b.position.x;
  M().Body.applyForce(b, b.position, {
    x: Math.sign(dx) * marble.magnet * b.mass,
    y: 0,
  });
}

// marble.js — Creación del cuerpo físico de una canica. El "objeto canica" (identidad
// + estado de poderes) lo construye marblePool.js; aquí solo el cuerpo Matter.

import { CONFIG } from './config.js';

export function createMarbleBody(x, y, radius) {
  const M = window.Matter;
  return M.Bodies.circle(x, y, radius, {
    restitution: CONFIG.restitution,
    friction: CONFIG.friction,
    frictionAir: CONFIG.frictionAir,
    density: 0.0015,
    label: 'marble',
  });
}

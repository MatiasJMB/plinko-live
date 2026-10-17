// physics.js — Wrapper fino sobre Matter.js. Crea UN solo mundo con los cuerpos
// estáticos (clavos del triángulo, paredes diagonales en V, divisores de celdas)
// creados UNA vez. Las canicas las gestiona marblePool.js. El scoring NO usa sensores:
// se hace por posición al cruzar la línea de meta (más simple y robusto).

import { CONFIG } from './config.js';

export function createWorld(board) {
  const M = window.Matter;
  const engine = M.Engine.create();
  engine.gravity.y = CONFIG.gravity;
  engine.gravity.x = 0;
  engine.enableSleeping = true; // canicas asentadas duermen → ahorra CPU

  const statics = [];

  // Clavos del triángulo
  for (const p of board.pegs) {
    statics.push(
      M.Bodies.circle(p.x, p.y, p.r, {
        isStatic: true,
        restitution: CONFIG.pegRestitution,
        friction: 0,
        label: 'peg',
      })
    );
  }

  // Paredes diagonales (lados del triángulo) y verticales (cajón de bins)
  for (const w of board.walls) {
    const dx = w.x2 - w.x1;
    const dy = w.y2 - w.y1;
    const len = Math.hypot(dx, dy);
    statics.push(
      M.Bodies.rectangle((w.x1 + w.x2) / 2, (w.y1 + w.y2) / 2, len, w.thick, {
        isStatic: true,
        angle: Math.atan2(dy, dx),
        label: 'wall',
      })
    );
  }

  // Divisores entre celdas
  for (const d of board.dividers) {
    const h = d.yBottom - d.yTop;
    statics.push(
      M.Bodies.rectangle(d.x, d.yTop + h / 2, 4, h, { isStatic: true, label: 'divider' })
    );
  }

  M.Composite.add(engine.world, statics);
  return { engine, world: engine.world };
}

export function step(engine, deltaMs) {
  const M = window.Matter;
  const dt = Math.min(deltaMs, 32); // un frame lento no debe teletransportar canicas
  M.Engine.update(engine, dt);

  // Clamp de velocidad: si dos canicas nacen/quedan solapadas, el solver puede
  // expulsarlas a cientos de px/frame (salían disparadas fuera del tablero). Limitar
  // el módulo de la velocidad mantiene la caída tipo Galton y evita el caos.
  const vmax = CONFIG.maxSpeed;
  for (const body of M.Composite.allBodies(engine.world)) {
    if (body.isStatic || body.isSleeping) continue;
    const v = body.velocity;
    const sp = Math.hypot(v.x, v.y);
    if (sp > vmax) M.Body.setVelocity(body, { x: (v.x / sp) * vmax, y: (v.y / sp) * vmax });
  }
}

export function addBody(world, body) {
  window.Matter.Composite.add(world, body);
}
export function removeBody(world, body) {
  window.Matter.Composite.remove(world, body);
}

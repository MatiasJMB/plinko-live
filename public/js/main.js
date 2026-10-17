// main.js — Bootstrap del overlay: crea el canvas a tamaño de ventana, el mundo
// físico y el bucle de animación; conecta el WebSocket y enruta los regalos al
// roundManager.

import { computeBoard } from './board.js';
import { createWorld, step } from './physics.js';
import { endRound } from './marblePool.js';
import * as render from './render.js';
import * as hud from './hud.js';
import { connect } from './net.js';
import { initRound, onGift, updateRound } from './roundManager.js';

const canvas = document.getElementById('stage');
let board;
let sim;

function setup() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;
  if (sim) endRound(sim.world); // limpia canicas del mundo anterior al redimensionar
  board = computeBoard(w, h);
  sim = createWorld(board);
  initRound({ world: sim.world, board, hud, render });
}

// HUD: referencias a los nodos del DOM.
hud.initHud({
  status: document.getElementById('status'),
  scoreboard: document.getElementById('scoreboard'),
  champions: document.getElementById('champions'),
  winner: document.getElementById('winner'),
  boss: document.getElementById('boss'),
});
render.initRender(canvas);
setup();

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(setup, 250);
});

// Recibe eventos del servidor (regalos reales o simulados).
connect((ev) => {
  if (ev.type === 'gift') onGift(ev);
});

// Bucle principal.
let last = performance.now();
function frame(now) {
  const dt = now - last;
  last = now;
  step(sim.engine, dt);
  updateRound(now);
  render.render(board);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Modo demo autónomo (sin servidor): abre /?demo=1 para ver el overlay en acción.
if (new URLSearchParams(location.search).has('demo')) runDemo();

function runDemo() {
  // Mini-tabla local de tiers (en producción los calcula src/giftMap.js).
  const samples = [
    { tier: 0, multiplier: 1, powers: [] },
    { tier: 1, multiplier: 1, powers: ['boost'] },
    { tier: 2, multiplier: 2, powers: ['magnet', 'second', 'trail'] },
    { tier: 3, multiplier: 3, powers: ['legendary', 'magnet', 'trailGold', 'pierce'] },
    { tier: 4, multiplier: 5, powers: ['boss', 'legendary', 'magnet', 'pierceAll'] },
  ];
  const names = ['ana', 'pedro', 'maria', 'cami', 'tito', 'sofi', 'javi', 'naty'];
  let i = 0;
  const iv = setInterval(() => {
    // Sesga hacia tiers bajos (como un Live real), con algún tier alto ocasional.
    const r = Math.random();
    const s = samples[r < 0.5 ? 0 : r < 0.72 ? 1 : r < 0.88 ? 2 : r < 0.97 ? 3 : 4];
    const u = names[Math.floor(Math.random() * names.length)];
    onGift({ type: 'gift', userId: 'demo_' + u, username: '@' + u, nickname: u, avatarUrl: null, ...s });
    if (++i >= 60) clearInterval(iv);
  }, 220);
}

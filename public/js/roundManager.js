// roundManager.js — El cerebro del juego. Cicla rondas, procesa los regalos
// entrantes, puntúa las canicas al caer en los bins y mantiene el leaderboard.
//
// Fases:
//   'open'    (CONFIG.roundOpenMs)    → entran y caen canicas, marcador en vivo.
//   'results' (CONFIG.roundResultsMs) → corona + shout-out del ganador, canicas
//                                       asentadas a la vista; al terminar se limpia.
// Cada regalo lanza canica(s) (segunda canica con el poder 'second'); el score de
// todas las canicas de un mismo donante se suma a su total de la ronda.

import { CONFIG } from './config.js';
import { spawnMarble, despawnMarble, endRound, eachMarble } from './marblePool.js';
import { applyPowers, tickMagnet } from './powers.js';

let world, board, hud, render;
const state = {
  phase: 'open',
  phaseUntil: 0,
  roundScores: new Map(), // userId -> { userId, username, nickname, avatarUrl, tier, score }
  spawnQueue: [], // identidades pendientes (spawn escalonado)
};

export function initRound(deps) {
  world = deps.world;
  board = deps.board;
  hud = deps.hud;
  render = deps.render;
  state.phase = 'open';
  state.phaseUntil = performance.now() + CONFIG.roundOpenMs;
}

// Llega un regalo (evento canónico ya normalizado).
export function onGift(event) {
  const identity = {
    userId: event.userId,
    username: event.username,
    nickname: event.nickname,
    avatarUrl: event.avatarUrl,
    tier: event.tier,
    multiplier: event.multiplier ?? 1,
    powers: event.powers ?? [],
  };
  if (event.tier === 4) hud.bossIntro(identity); // intro a pantalla completa
  const copies = identity.powers.includes('second') ? 2 : 1;
  for (let i = 0; i < copies; i++) state.spawnQueue.push(identity);
}

// Llamado cada frame desde main.js.
export function updateRound(now) {
  // Transición de fase.
  if (state.phase === 'open' && now >= state.phaseUntil) enterResults(now);
  else if (state.phase === 'results' && now >= state.phaseUntil) enterOpen(now);

  if (state.phase === 'open') releaseQueue();

  // Imán por frame + puntuación al cruzar la meta. Las que aun así se cuelen bajo el
  // suelo (ya puntuaron y están fuera de pantalla) se recogen y despawnean: liberan su
  // slot en vez de caer al infinito. (Se despawnea FUERA del bucle: no mutar el Map mientras se itera.)
  const fellOut = [];
  eachMarble((m) => {
    tickMagnet(m, board.centerX);
    if (!m.scored && m.body.position.y >= board.goalLineY) scoreMarble(m);
    if (m.body.position.y > board.binBottom + m.radius * 2) fellOut.push(m.id);
  });
  for (const id of fellOut) despawnMarble(world, id);

  // Refresca el HUD (marcador en vivo + countdown).
  hud.update({
    phase: state.phase,
    timeLeftMs: Math.max(0, state.phaseUntil - now),
    ranking: getRanking(),
  });
}

function releaseQueue() {
  let n = Math.min(CONFIG.spawnPerFrame, state.spawnQueue.length);
  while (n-- > 0) {
    const identity = state.spawnQueue.shift();
    const marble = spawnMarble(world, board, identity);
    applyPowers(marble);
  }
}

function scoreMarble(m) {
  const bin = binAt(m.body.position.x);
  const value = bin ? bin.value : 0;
  m.scored = true;
  m.landedBin = bin ? bin.index : -1;
  m.score = value * (m.multiplier || 1);
  addRoundScore(m);
  render.addScorePopup(m.body.position.x, board.goalLineY, m.score, m.tier);
  if (bin) render.flashBin(bin.index);
}

function addRoundScore(m) {
  let e = state.roundScores.get(m.userId);
  if (!e) {
    e = {
      userId: m.userId,
      username: m.username,
      nickname: m.nickname,
      avatarUrl: m.avatarUrl,
      tier: m.tier,
      score: 0,
    };
    state.roundScores.set(m.userId, e);
  }
  e.score += m.score;
  e.tier = Math.max(e.tier, m.tier);
  e.avatarUrl = m.avatarUrl ?? e.avatarUrl;
}

function getRanking() {
  return [...state.roundScores.values()].sort((a, b) => b.score - a.score);
}

function enterResults(now) {
  state.phase = 'results';
  state.phaseUntil = now + CONFIG.roundResultsMs;
  const ranking = getRanking();
  const winner = ranking[0] ?? null;
  persistChampions();
  hud.showWinner(winner, loadChampions());
}

function enterOpen(now) {
  state.phase = 'open';
  state.phaseUntil = now + CONFIG.roundOpenMs;
  endRound(world); // limpia todas las canicas de la ronda anterior
  state.roundScores.clear();
  hud.clearWinner();
}

function binAt(x) {
  for (const bin of board.bins) if (x >= bin.x0 && x < bin.x1) return bin;
  // Fuera de rango → bin del extremo más cercano.
  return x < board.bins[0].x0 ? board.bins[0] : board.bins[board.bins.length - 1];
}

// --- Leaderboard persistente (localStorage del navegador / CEF de OBS) ---
const LS_KEY = 'plinko_champions';

function loadChampions() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
}

function persistChampions() {
  const champs = loadChampions();
  for (const e of state.roundScores.values()) {
    if (e.score <= 0) continue;
    let c = champs.find((x) => x.userId === e.userId);
    if (!c) {
      c = { userId: e.userId, points: 0 };
      champs.push(c);
    }
    c.points += e.score;
    c.username = e.username;
    c.nickname = e.nickname;
    c.avatarUrl = e.avatarUrl;
  }
  champs.sort((a, b) => b.points - a.points);
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(champs.slice(0, 50)));
  } catch {
    /* almacenamiento lleno o bloqueado: el leaderboard de sesión sigue funcionando */
  }
}

// hud.js — Toda la interfaz de texto, en DOM (más nítida y barata de actualizar que
// redibujarla en canvas cada frame): marcador en vivo, countdown de fase, leaderboard
// de campeones, banner del ganador y la intro de "MODO JEFE" a pantalla completa.

import { colorFor } from './avatars.js';

let el = {};

export function initHud(elements) {
  el = elements;
}

export function update({ phase, timeLeftMs, ranking }) {
  const secs = Math.ceil(timeLeftMs / 1000);
  if (phase === 'open') {
    el.status.textContent = `🏁 Ronda en curso · ${secs}s`;
    el.status.className = 'status open';
  } else {
    el.status.textContent = `🏆 Resultados · próxima en ${secs}s`;
    el.status.className = 'status results';
  }

  // Marcador en vivo (top 6 de la ronda)
  const top = ranking.slice(0, 6);
  el.scoreboard.innerHTML =
    `<div class="sb-title">EN VIVO</div>` +
    (top.length
      ? top
          .map(
            (e, i) =>
              `<div class="sb-row">` +
              `<span class="sb-pos">${i + 1}</span>` +
              chip(e.userId, e.nickname, e.avatarUrl, 26) +
              `<span class="sb-name">${esc(e.nickname || e.username)}</span>` +
              `<span class="sb-score">${e.score}</span>` +
              `</div>`
          )
          .join('')
      : `<div class="sb-empty">¡Envía un regalo para entrar!</div>`);
}

export function showWinner(winner, champions) {
  if (winner) {
    el.winner.innerHTML =
      `<div class="win-label">👑 GANA LA RONDA</div>` +
      chip(winner.userId, winner.nickname, winner.avatarUrl, 96) +
      `<div class="win-name">${esc(winner.nickname || winner.username)}</div>` +
      `<div class="win-score">${winner.score} pts</div>`;
    el.winner.classList.add('show');
  }
  renderChampions(champions);
}

export function clearWinner() {
  el.winner.classList.remove('show');
}

export function bossIntro(identity) {
  el.boss.innerHTML =
    `<div class="boss-inner">` +
    chip(identity.userId, identity.nickname, identity.avatarUrl, 200) +
    `<div class="boss-title">⚡ MODO JEFE ⚡</div>` +
    `<div class="boss-name">${esc(identity.nickname || identity.username)}</div>` +
    `</div>`;
  el.boss.classList.add('show');
  clearTimeout(bossIntro._t);
  bossIntro._t = setTimeout(() => el.boss.classList.remove('show'), 2600);
}

function renderChampions(champions) {
  const top = (champions || []).slice(0, 5);
  el.champions.innerHTML =
    `<div class="ch-title">🏆 CAMPEONES</div>` +
    top
      .map(
        (c, i) =>
          `<div class="ch-row">` +
          `<span class="ch-pos">${i + 1}</span>` +
          chip(c.userId, c.nickname, c.avatarUrl, 24) +
          `<span class="ch-name">${esc(c.nickname || c.username || 'anon')}</span>` +
          `<span class="ch-score">${c.points}</span>` +
          `</div>`
      )
      .join('');
}

// Avatar "chip": círculo con inicial y color; si hay URL, superpone la imagen.
function chip(userId, nickname, avatarUrl, size) {
  const bg = colorFor(userId);
  const initial = (nickname || '?').trim().charAt(0).toUpperCase() || '?';
  const img = avatarUrl
    ? `<img src="${esc(avatarUrl)}" onerror="this.style.display='none'" alt="">`
    : '';
  return (
    `<span class="chip" style="width:${size}px;height:${size}px;` +
    `background:${bg};font-size:${Math.round(size * 0.5)}px">${initial}${img}</span>`
  );
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

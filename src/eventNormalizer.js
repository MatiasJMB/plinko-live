// eventNormalizer.js — Convierte el payload CRUDO de TikTok (o del simulador) en
// un "evento canónico" estable que viaja por WebSocket al overlay.
//
// Lectura DEFENSIVA: el shape del payload de tiktok-live-connector v2 anida los
// datos bajo `user` y `giftDetails`, pero cambia entre versiones menores. Usamos
// fallbacks para no romper si un campo se mueve.

import { tierForDiamonds } from './giftMap.js';

function pickUser(data) {
  const u = data.user ?? data;
  return {
    userId: String(u.userId ?? u.uniqueId ?? 'anon'),
    username: '@' + (u.uniqueId ?? 'anon'),
    nickname: u.nickname ?? u.uniqueId ?? 'Anónimo',
    avatarUrl:
      u.profilePictureUrl ??
      u.profilePicture?.urls?.[0] ??
      u.profilePicture?.url?.[0] ??
      u.profilePicture?.url ??
      null,
  };
}

// Regalo → evento canónico de tipo 'gift'.
export function normalizeGift(data) {
  const user = pickUser(data);
  const repeat = data.repeatCount ?? 1;
  const unit = data.diamondCount ?? data.giftDetails?.diamondCount ?? 0;
  const diamonds = unit * repeat;
  const tier = tierForDiamonds(diamonds);

  return {
    type: 'gift',
    ...user,
    giftName: data.giftName ?? data.giftDetails?.giftName ?? 'gift',
    diamonds,
    multiplier: tier.mult,
    tier: tier.id,
    tierName: tier.name,
    powers: tier.powers,
    count: repeat,
    ts: nowTs(),
  };
}

// Eventos secundarios (vida del overlay): no spawnan canicas, alimentan el HUD.
export function normalizeJoin(data) {
  return { type: 'join', ...pickUser(data), ts: nowTs() };
}
export function normalizeLike(data) {
  return { type: 'like', ...pickUser(data), count: data.likeCount ?? 1, ts: nowTs() };
}
export function normalizeChat(data) {
  return { type: 'chat', ...pickUser(data), text: data.comment ?? '', ts: nowTs() };
}

function nowTs() {
  return Date.now();
}

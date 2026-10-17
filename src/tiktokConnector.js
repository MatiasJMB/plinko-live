// tiktokConnector.js — Conexión al TikTok Live real (Fase 3). Se importa de forma
// DINÁMICA desde server.js solo en modo live, para que el simulador no dependa de
// este paquete (ni de `got`, que pide Node ≥22).
//
// API v2 de tiktok-live-connector (2.4.0): clase TikTokLiveConnection + enum
// WebcastEvent. NO es WebcastPushConnection (eso era v1).
//
// Anti-doble-conteo de streaks: los regalos "combo" (giftType === 1) emiten el
// evento repetidamente mientras el usuario mantiene pulsado; solo el evento final
// trae repeatEnd === true. Procesamos SOLO cuando giftType !== 1 || repeatEnd.

import { TikTokLiveConnection, WebcastEvent } from 'tiktok-live-connector';
import {
  normalizeGift,
  normalizeJoin,
  normalizeLike,
  normalizeChat,
} from './eventNormalizer.js';

export function startConnector({ username, signApiKey, onEvent }) {
  if (!username) throw new Error('Falta TIKTOK_USERNAME');
  const handle = username.startsWith('@') ? username : '@' + username;

  const conn = new TikTokLiveConnection(handle, {
    signApiKey, // API key gratuita de EulerStream (recomendada para estabilidad)
    enableExtendedGiftInfo: true, // diamondCount / nombre de regalo fiables
    processInitialData: false, // no reproducir el historial al conectar
  });

  conn.on(WebcastEvent.GIFT, (data) => {
    const giftType = data.giftType ?? data.giftDetails?.giftType;
    const repeatEnd = data.repeatEnd ?? false;
    if (giftType === 1 && repeatEnd === false) return; // streak en curso → ignorar
    onEvent(normalizeGift(data));
  });

  conn.on(WebcastEvent.MEMBER, (d) => onEvent(normalizeJoin(d)));
  conn.on(WebcastEvent.LIKE, (d) => onEvent(normalizeLike(d)));
  conn.on(WebcastEvent.CHAT, (d) => onEvent(normalizeChat(d)));

  conn.on('connected', (state) =>
    console.log('[live] conectado · roomId', state?.roomId ?? '?')
  );
  conn.on('streamEnd', () => console.log('[live] el Live finalizó'));
  conn.on('error', (e) => console.error('[live] error:', e?.message ?? e));
  conn.on('disconnected', () => {
    console.warn('[live] desconectado, reintentando…');
    scheduleReconnect();
  });

  // Backoff exponencial: respeta los rate limits de EulerStream (429).
  let backoff = 2000;
  function connect() {
    conn
      .connect()
      .then(() => {
        backoff = 2000;
      })
      .catch((err) => {
        console.error('[live] fallo de conexión:', err?.message ?? err);
        scheduleReconnect();
      });
  }
  function scheduleReconnect() {
    const delay = backoff;
    backoff = Math.min(backoff * 2, 60000);
    setTimeout(connect, delay);
  }

  connect();
  return conn;
}

// simulator.js — Inyecta regalos FALSOS para desarrollar/probar toda la mecánica
// SIN un Live real ni 1000 seguidores. Dos vías:
//   a) Teclado en la terminal: 0-4 = tier, b = ráfaga, c = streak, q = salir.
//   b) HTTP: POST /sim  con body JSON { tier } o { diamonds, userId }.
//
// Produce el MISMO evento canónico que el conector real (pasa por normalizeGift),
// así el overlay no nota la diferencia.

import { normalizeGift } from './eventNormalizer.js';

// Usuarios ficticios (sin avatarUrl: el overlay dibuja iniciales con color → cero red).
const FAKE_USERS = [
  { uniqueId: 'lucky_ana', nickname: 'Ana 🍀', userId: '1001' },
  { uniqueId: 'pedro_gg', nickname: 'Pedro', userId: '1002' },
  { uniqueId: 'maria_xd', nickname: 'María', userId: '1003' },
  { uniqueId: 'cami_streamer', nickname: 'Cami', userId: '1004' },
  { uniqueId: 'tito_99', nickname: 'Tito', userId: '1005' },
  { uniqueId: 'sofi_rosa', nickname: 'Sofi', userId: '1006' },
  { uniqueId: 'el_javi', nickname: 'Javi', userId: '1007' },
  { uniqueId: 'naty_star', nickname: 'Naty ⭐', userId: '1008' },
];

// (giftName, diamondCount) representativo de cada tier 0..4.
const FAKE_GIFTS = [
  ['Rose', 1],
  ['Doughnut', 30],
  ['Sunglasses', 199],
  ['Galaxy', 1000],
  ['Universe', 34999],
];

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Construye un evento canónico de regalo para un tier (o un usuario concreto).
export function fakeGiftEvent(tier = 0, userId = null) {
  const t = Math.max(0, Math.min(4, Number(tier) | 0));
  const user = userId
    ? FAKE_USERS.find((u) => u.userId === String(userId)) ?? rand(FAKE_USERS)
    : rand(FAKE_USERS);
  const [giftName, diamondCount] = FAKE_GIFTS[t] ?? FAKE_GIFTS[0];
  return normalizeGift({
    user,
    giftName,
    diamondCount,
    repeatCount: 1,
    giftType: 0,
    repeatEnd: true,
  });
}

// Maneja POST /sim — usado por tools/sim-panel.html y por curl.
export function handleSimRequest(req, res, bridge) {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 1e4) req.destroy(); // anti-abuso
  });
  req.on('end', () => {
    let payload = {};
    try {
      payload = JSON.parse(body || '{}');
    } catch {
      /* body vacío o inválido: usa defaults */
    }
    const event =
      payload.diamonds != null
        ? simGiftFromDiamonds(payload.diamonds, payload.userId)
        : fakeGiftEvent(payload.tier ?? 0, payload.userId);
    bridge.broadcast(event);
    res.writeHead(204).end();
  });
}

function simGiftFromDiamonds(diamonds, userId) {
  const user = userId
    ? FAKE_USERS.find((u) => u.userId === String(userId)) ?? rand(FAKE_USERS)
    : rand(FAKE_USERS);
  return normalizeGift({
    user,
    giftName: 'Custom',
    diamondCount: Number(diamonds) || 1,
    repeatCount: 1,
    giftType: 0,
    repeatEnd: true,
  });
}

// Simula un streak (giftType:1) para verificar que el overlay NO cuenta doble:
// emitimos solo el evento final (repeatEnd:true), igual que hace el conector real.
function streakEvent(bridge) {
  const user = rand(FAKE_USERS);
  bridge.broadcast(
    normalizeGift({
      user,
      giftName: 'Rose x10',
      diamondCount: 1,
      repeatCount: 10,
      giftType: 1,
      repeatEnd: true,
    })
  );
}

// Teclado interactivo en la terminal.
export function attachKeyboard(bridge) {
  if (!process.stdin.isTTY) {
    console.log('[sim] stdin no es TTY; usa POST /sim o el panel para inyectar regalos.');
    return;
  }
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  printHelp();
  process.stdin.on('data', (key) => {
    if (key >= '0' && key <= '4') {
      bridge.broadcast(fakeGiftEvent(Number(key)));
    } else if (key === 'b' || key === 'B') {
      for (let i = 0; i < 20; i++) {
        bridge.broadcast(fakeGiftEvent(Math.floor(Math.random() * 3)));
      }
      console.log('[sim] ráfaga de 20 canicas (prueba de carga)');
    } else if (key === 'c' || key === 'C') {
      streakEvent(bridge);
      console.log('[sim] streak emitido (debe contar UNA vez)');
    } else if (key === 'h' || key === 'H' || key === '?') {
      printHelp();
    } else if (key === 'q' || key === 'Q' || key === '') {
      console.log('\n[sim] saliendo…');
      process.exit(0);
    }
  });
}

function printHelp() {
  console.log(`
┌──────────────── SIMULADOR DE REGALOS ────────────────┐
│  0  Rose (T0 · entrada)      3  Galaxy (T3 · legendaria) │
│  1  Doughnut (T1 · boost)    4  Universe (T4 · MODO JEFE)│
│  2  Sunglasses (T2 · poder)                              │
│  b  ráfaga de 20  ·  c  streak  ·  h  ayuda  ·  q  salir │
└─────────────────────────────────────────────────────────┘`);
}

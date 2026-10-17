// giftMap.js — Configuración PURA: valor en diamantes → tier → poderes/multiplicador.
// No tiene lógica de juego; se tunea aquí sin tocar el resto del código.
//
// El "valor" de un regalo es diamondCount * repeatCount (coste total del streak).
// Los nombres de regalo son solo ejemplos reales de TikTok (varían por región);
// la fuente de verdad SIEMPRE es diamondCount.

export const TIERS = [
  {
    id: 0,
    name: 'entry',
    label: 'Entrada',
    min: 1,
    mult: 1,
    powers: [],
    color: '#9aa7b4',
    examples: ['Rose', 'TikTok', 'GG', 'Heart'],
  },
  {
    id: 1,
    name: 'boost',
    label: 'Boost',
    min: 5,
    mult: 1,
    powers: ['boost'], // powers.js elige turbo|shield|size
    color: '#4cc9f0',
    examples: ['Doughnut', 'Perfume', 'Finger Heart'],
  },
  {
    id: 2,
    name: 'power',
    label: 'Poder',
    min: 100,
    mult: 2,
    powers: ['magnet', 'second', 'trail'],
    color: '#b15cff',
    examples: ['Sunglasses', 'Boxing Gloves', 'Coral'],
  },
  {
    id: 3,
    name: 'legendary',
    label: 'Legendaria',
    min: 500,
    mult: 3,
    powers: ['legendary', 'magnet', 'trailGold', 'pierce'],
    color: '#ffd166',
    examples: ['Galaxy', 'Whale diving'],
  },
  {
    id: 4,
    name: 'boss',
    label: 'Modo Jefe',
    min: 5000,
    mult: 5,
    powers: ['boss', 'legendary', 'magnet', 'pierceAll'],
    color: '#ff2e63',
    examples: ['Universe', 'Lion', 'Falcon'],
  },
];

// Devuelve el tier más alto cuyo umbral `min` no supera los diamantes dados.
export function tierForDiamonds(diamonds) {
  let result = TIERS[0];
  for (const tier of TIERS) {
    if (diamonds >= tier.min) result = tier;
  }
  return result;
}

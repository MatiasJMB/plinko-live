// config.js — Parámetros ajustables del overlay (comparte todo el frontend).
export const CONFIG = {
  // Tablero de Galton (triángulo): `rows` filas de clavos → rows+1 celdas abajo.
  rows: 12,

  // Radios DINÁMICOS: computeBoard() los recalcula según el tamaño real para que
  // siempre haya buena proporción clavo/bola/hueco (estos son solo valores iniciales).
  marbleRadius: 11,
  pegRadius: 5,

  // Capacidad (techo duro de RAM/CPU para el i3 + 3.7 GB)
  maxMarbles: 70,
  spawnPerFrame: 1, // suelta como máx N canicas/frame (>1 nacía solapado → explosión)
  spawnJitter: 0.7, // variación horizontal al soltar (× pinSpacing): franja ancha
  //   para que dos canicas seguidas NO nazcan una encima de otra.
  dropSpeed: 5, // velocidad inicial hacia abajo: despeja rápido la zona de entrada.
  maxSpeed: 16, // clamp duro de velocidad (red de seguridad anti-explosión del solver).

  // Ritmo de rondas
  roundOpenMs: 25000,
  roundResultsMs: 7000,

  // Física: rebotes SUAVES → distribución tipo Galton (no caos)
  gravity: 1,
  restitution: 0.2, // rebote de las canicas (bajo)
  friction: 0.02,
  frictionAir: 0.012, // amortigua para que no se aceleren de más
  pegRestitution: 0.25,

  // Valores de las celdas por nivel de distancia al centro (extremos = jackpot)
  binLevelValues: [5, 10, 25, 50, 150, 400, 1000],

  // Paleta por tier (debe coincidir con src/giftMap.js)
  tierColors: ['#9aa7b4', '#4cc9f0', '#b15cff', '#ffd166', '#ff2e63'],
  tierLabels: ['Entrada', 'Boost', 'Poder', 'Legendaria', 'MODO JEFE'],
};

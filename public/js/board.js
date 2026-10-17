// board.js — Geometría PURA del tablero de Galton (triángulo). Calculada a partir del
// tamaño del canvas (responsive: sirve para vertical 9:16 u horizontal 16:9 en OBS).
//
//          .            fila 0 → 1 clavo (la punta, arriba)
//         . .           fila 1 → 2 clavos
//        . . .          fila 2 → 3 clavos
//       . . . .         …
//   [ celdas / bins ]   rows+1 celdas; extremos = jackpot, centro = bajo
//
// Las bolas caen desde encima de la punta y se reparten SOLO por los rebotes en los
// clavos. Clave para que la distribución sea una campana (no una U): clavos grandes y
// juntos → la bola avanza hueco-a-hueco y no puede derivar saltándose clavos.

import { CONFIG } from './config.js';

const ROW_FACTOR = 0.72; // separación vertical entre filas (× pinSpacing)

export function computeBoard(width, height) {
  const rows = CONFIG.rows;
  const nbins = rows + 1;
  const centerX = width / 2;

  const usableW = width * 0.94;
  const usableH = height * 0.94;

  // Unidades de altura del tablero, en múltiplos de pinSpacing (para limitar el tamaño).
  const spawnUnits = 0.9;
  const binGapUnits = 0.5;
  const binHeightUnits = 1.9;
  const heightUnits = spawnUnits + ROW_FACTOR * (rows - 1) + binGapUnits + binHeightUnits;

  // pinSpacing que cabe a lo ancho Y a lo alto.
  const pinSpacing = Math.min(usableW / (rows + 1), usableH / heightUnits);
  const rowSpacing = pinSpacing * ROW_FACTOR;

  // Clavos pequeños (no atascan) + bola mediana; la contención lateral la dan las
  // paredes escalonadas de abajo, no el tamaño de los clavos.
  const marbleRadius = pinSpacing * 0.18;
  const pegRadius = pinSpacing * 0.1;
  CONFIG.marbleRadius = marbleRadius; // dinámico: lo usan marblePool/powers
  CONFIG.pegRadius = pegRadius;

  const spawnGap = pinSpacing * spawnUnits;
  const binGap = pinSpacing * binGapUnits;
  const binHeight = pinSpacing * binHeightUnits;
  const boardH = spawnGap + (rows - 1) * rowSpacing + binGap + binHeight;

  const topY = Math.max(height * 0.05, (height - boardH) / 2);
  const apexY = topY + spawnGap; // y del primer clavo (la punta)

  // Clavos: fila r (0..rows-1) tiene r+1 clavos, centrados en centerX.
  const pegs = [];
  for (let r = 0; r < rows; r++) {
    const y = apexY + r * rowSpacing;
    for (let k = 0; k <= r; k++) {
      const x = centerX + (k - r / 2) * pinSpacing;
      pegs.push({ x, y, r: pegRadius });
    }
  }

  // Celdas: nbins slots bajo la última fila (alineados con sus huecos).
  const goalLineY = apexY + (rows - 1) * rowSpacing + binGap;
  const binBottom = goalLineY + binHeight;
  const values = genBinValues(nbins);
  const bins = [];
  const dividers = [];
  for (let i = 0; i < nbins; i++) {
    const cx = centerX + (i - rows / 2) * pinSpacing;
    bins.push({ index: i, x0: cx - pinSpacing / 2, x1: cx + pinSpacing / 2, cx, value: values[i] });
    dividers.push({ x: cx - pinSpacing / 2, yTop: goalLineY, yBottom: binBottom });
  }
  dividers.push({ x: bins[nbins - 1].x1, yTop: goalLineY, yBottom: binBottom });

  // Paredes laterales que SIGUEN el borde del triángulo (escalonadas, verticales por
  // fila) para contener sin canalizar: cada tramo es vertical, así una bola que llega
  // al borde rebota hacia adentro (no rueda hacia el extremo como haría una rampa).
  const walls = [];
  for (let r = 1; r < rows; r++) {
    const yTop = apexY + (r - 1) * rowSpacing;
    const yBot = apexY + r * rowSpacing + rowSpacing * 0.1;
    const leftEdge = centerX - (r / 2) * pinSpacing - pinSpacing * 0.5;
    const rightEdge = centerX + (r / 2) * pinSpacing + pinSpacing * 0.5;
    walls.push({ x1: leftEdge, y1: yTop, x2: leftEdge, y2: yBot, thick: 5 });
    walls.push({ x1: rightEdge, y1: yTop, x2: rightEdge, y2: yBot, thick: 5 });
  }
  // Verticales del cajón de bins
  walls.push({ x1: bins[0].x0, y1: goalLineY, x2: bins[0].x0, y2: binBottom, thick: 6 });
  walls.push({ x1: bins[nbins - 1].x1, y1: goalLineY, x2: bins[nbins - 1].x1, y2: binBottom, thick: 6 });
  // SUELO del cajón: sin él las canicas atraviesan el fondo y se caen del canvas en vez
  // de asentarse en su celda (cada celda queda cerrada por las dos dividers + este suelo).
  // Grueso a propósito: un suelo fino lo perfora la PRESIÓN de la pila de canicas (el
  // solver expulsa la de abajo a través de una pared delgada). 40 px lo hace infranqueable.
  walls.push({ x1: bins[0].x0, y1: binBottom, x2: bins[nbins - 1].x1, y2: binBottom, thick: 40 });

  return {
    width,
    height,
    centerX,
    pinSpacing,
    rowSpacing,
    marbleRadius,
    pegRadius,
    pegs,
    bins,
    dividers,
    walls,
    goalLineY,
    binBottom,
    apexY,
    topY,
    boardH,
    spawn: {
      y: apexY - rowSpacing * 0.95,
      xMin: centerX - pinSpacing * CONFIG.spawnJitter,
      xMax: centerX + pinSpacing * CONFIG.spawnJitter,
    },
  };
}

// Valores en V: centro bajo (frecuente), extremos jackpot (raros) — como Galton.
function genBinValues(n) {
  const lv = CONFIG.binLevelValues;
  const center = (n - 1) / 2;
  const maxDist = center || 1;
  return Array.from({ length: n }, (_, i) => {
    const dist = Math.abs(i - center);
    const level = Math.round((dist / maxDist) * (lv.length - 1));
    return lv[Math.min(level, lv.length - 1)];
  });
}

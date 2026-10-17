# Plinko Live

Overlay de canicas tipo Plinko para transmisiones en vivo de TikTok: cada regalo suelta una canica con física. Para streamers que usan OBS con una fuente de navegador.

## Qué hace

- Cada regalo suelta una canica con el @ y el avatar de quien lo envía (tier T0).
- El valor del regalo en diamantes define el tier: T1 (5 o más) activa boosts; T2 (100 o más) agrega imán, segunda canica y multiplicador ×2; T3 (500 o más) entrega una canica dorada; T4 (5000 o más) activa el modo jefe a pantalla completa. Umbrales en `src/giftMap.js`.
- Modo simulador para probar sin TikTok: teclado en la terminal (`0`–`4`, `b`, `c`, `q`), panel de regalos en `/sim-panel.html` o una petición `POST /sim`.
- Modo Live: conecta con el chat de TikTok mediante `tiktok-live-connector` (requiere `TIKTOK_USERNAME`).
- El overlay se sirve en `http://localhost:8080/` y recibe los eventos por WebSocket.

## Stack

- Node.js 20 o superior (`engines`: >=20), servidor HTTP nativo y `ws` ^8.21.0.
- `tiktok-live-connector` ^2.4.0 (solo en modo Live).
- Overlay con Canvas y Matter.js (incluido en `public/js/vendor/`).
- HTML, CSS y JavaScript sin framework ni build.

## Cómo correrlo en local

```bash
npm install
npm run sim            # simulador en http://localhost:8080 (sin TikTok)
```

Overlay: `http://localhost:8080/`. Panel de regalos: `http://localhost:8080/sim-panel.html`.

Modo Live: crear `.env` a partir de `.env.example`, quitar `SIM`, definir `TIKTOK_USERNAME` y, opcionalmente, `EULER_API_KEY`; luego ejecutar `npm start`.

Variables de `.env.example`: `SIM`, `PORT`, `MAX_MARBLES`, `TIKTOK_USERNAME`, `EULER_API_KEY`.

Para OBS: fuente de navegador con `http://localhost:8080/`, 1280×720.

## Estructura

```text
src/            Proceso Node: servidor HTTP y WebSocket, simulador, conector de TikTok,
                normalizador de eventos, mapa de regalos a tiers
public/         Overlay (index.html, sim-panel.html, css/, js/) con física, render y rondas
public/js/vendor/  Matter.js
```

## Estado

Modo simulador funcional según el código. La conexión con TikTok Live está implementada, pero no se documenta una prueba de transmisión real en este repositorio.

## Licencia

MIT — ver LICENSE.

---
Hecho por Matías Moreno · github.com/MatiasJMB

// wsBridge.js — Hub WebSocket: reenvía (broadcast) cada evento canónico a todos los
// overlays conectados. Payloads pequeños (JSON con solo la URL del avatar, nunca
// binario) para no presionar la RAM.

export function makeBridge(wss) {
  return {
    broadcast(event) {
      const msg = JSON.stringify(event);
      for (const client of wss.clients) {
        // 1 === WebSocket.OPEN
        if (client.readyState === 1) {
          try {
            client.send(msg);
          } catch {
            /* cliente muerto: se limpiará solo en el próximo ciclo */
          }
        }
      }
    },
    get clientCount() {
      let n = 0;
      for (const c of wss.clients) if (c.readyState === 1) n++;
      return n;
    },
  };
}

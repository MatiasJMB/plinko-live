// net.js — Cliente WebSocket hacia el servidor (/events) con reconexión automática.
// El overlay vive dentro del Browser Source de OBS, así que debe reconectar solo si
// el servidor se reinicia.

export function connect(onEvent) {
  const url = `ws://${location.host}/events`;
  let retry = 1000;

  function open() {
    const ws = new WebSocket(url);
    ws.onopen = () => {
      retry = 1000;
    };
    ws.onmessage = (ev) => {
      try {
        onEvent(JSON.parse(ev.data));
      } catch {
        /* mensaje no-JSON: ignorar */
      }
    };
    ws.onclose = () => {
      setTimeout(open, retry);
      retry = Math.min(retry * 2, 15000);
    };
    ws.onerror = () => {
      try {
        ws.close();
      } catch {
        /* noop */
      }
    };
  }

  open();
}

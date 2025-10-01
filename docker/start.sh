#!/usr/bin/env bash
set -euo pipefail

# Vérifs utiles en log
echo "[init] whoami=$(whoami) node=$(node -v)"
echo "[init] DISPLAY=${DISPLAY:-unset}"

# Démarre l'écran virtuel
Xvfb :99 -screen 0 1280x800x24 >/tmp/xvfb.log 2>&1 &
sleep 0.8

# WM léger
fluxbox >/tmp/fluxbox.log 2>&1 &

# VNC + noVNC
x11vnc -display :99 -forever -shared -rfbport 5900 -nopw >/tmp/x11vnc.log 2>&1 &
websockify --web=/usr/share/novnc 7900 localhost:5900 >/tmp/novnc.log 2>&1 &

xterm -fa 'Monospace' -fs 11 >/tmp/xterm.log 2>&1 &

# Vérifie que le CLI Playwright est présent (dans l'image officielle, oui)
if npx --no-install playwright --version >/tmp/pw_version.log 2>&1; then
  echo "[playwright] $(cat /tmp/pw_version.log)"
else
  echo "[playwright] CLI introuvable en local, on force l'utilisation de la version 1.54.2 via npx -y"
fi

# Ouvre un onglet pour voir tout de suite quelque chose dans noVNC.
# NB: on passe par le CLI Playwright (évite require('playwright') si package indisponible)
# --browser=chromium et flags après -- pour Chromium
#npx -y playwright@1.54.2 open --browser=chromium https://www.wikipedia.org -- \
#  --no-sandbox --disable-dev-shm-usage >/tmp/pw_open.log 2>&1 &
#npx -y playwright@1.54.2 open --browser=chromium https://www.wikipedia.org
npx -y playwright@1.54.2 run-server --host 0.0.0.0 --port 3000 >/tmp/pw_server.log 2>&1 &
node /home/pwuser/pw-headful-server.js > /tmp/pw_headful_ws.log 2>&1 &

# Démarre Chromium via Playwright avec le port CDP 9222
# --- CDP headful Chromium (visible dans VNC) ---
# 1) S'assurer que le navigateur est installé côté utilisateur
if ! ls /ms-playwright/chromium-*/chrome-linux/chrome >/dev/null 2>&1 && \
   ! ls /home/pwuser/.cache/ms-playwright/chromium-*/chrome-linux/chrome >/dev/null 2>&1; then
  echo "[cdp] Installing Chromium to user cache..."
  PLAYWRIGHT_BROWSERS_PATH=/home/pwuser/.cache/ms-playwright \
    npx -y playwright@1.54.2 install chromium >/tmp/pw_install.log 2>&1 || {
      echo "[cdp] Install failed, see /tmp/pw_install.log"; exit 1;
    }
fi

# 2) Résoudre le chemin du binaire
CHROME_BIN=$(ls -d /ms-playwright/chromium-*/chrome-linux/chrome 2>/dev/null | head -n1)
[ -n "$CHROME_BIN" ] || CHROME_BIN=$(ls -d /home/pwuser/.cache/ms-playwright/chromium-*/chrome-linux/chrome 2>/dev/null | head -n1)
echo "[cdp] CHROME_BIN=$CHROME_BIN"

# 3) Lancer Chromium en CDP
mkdir -p /home/pwuser/profile
DISPLAY=:99 "$CHROME_BIN" \
  --remote-debugging-address=0.0.0.0 \
  --remote-debugging-port=9222 \
  --remote-allow-origins=* \
  --no-sandbox --disable-dev-shm-usage \
  --user-data-dir=/home/pwuser/profile \
  >/tmp/chrome-cdp.log 2>&1 &

# 4) Vérifier
sleep 1
curl -s http://127.0.0.1:9222/json/version
netstat -tlnp | grep 9222

# --- Proxy TCP Node: 0.0.0.0:9223 -> 127.0.0.1:9222 (CDP) ---
node - <<'JS' >/tmp/cdp-proxy.log 2>&1 &
const net = require('net');

const BIND_HOST = '0.0.0.0';
const LISTEN_PORT = 9223;
const TARGET_HOST = '127.0.0.1';
const TARGET_PORT = 9222;

const server = net.createServer((client) => {
  const upstream = net.connect({ host: TARGET_HOST, port: TARGET_PORT });

  // Piping bidirectionnel avec gestion de backpressure
  client.pipe(upstream);
  upstream.pipe(client);

  const onErr = (src, err) => {
    // log minimal sans tuer le serveur
    console.error(`[proxy] ${src} error:`, err && err.message);
    try { client.destroy(); } catch {}
    try { upstream.destroy(); } catch {}
  };

  client.on('error', (e) => onErr('client', e));
  upstream.on('error', (e) => onErr('upstream', e));

  client.on('close', () => { try { upstream.end(); } catch {} });
  upstream.on('close', () => { try { client.end(); } catch {} });
});

server.on('error', (e) => {
  console.error('[proxy] server error:', e && e.message);
  // ne pas exit; on reste vivant
});

server.listen(LISTEN_PORT, BIND_HOST, () => {
  console.log(`[proxy] listening on ${BIND_HOST}:${LISTEN_PORT} -> ${TARGET_HOST}:${TARGET_PORT}`);
});

// garder le process en vie
process.stdin.resume();
JS

# Garde le conteneur en vie
tail -f /dev/null
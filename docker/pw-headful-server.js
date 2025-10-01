// pw-headful-server.js
import { chromium, firefox } from 'playwright';

(async () => {
  //Lancer Chrome
  const server = await chromium.launchServer({
    headless: false,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    env: { DISPLAY: process.env.DISPLAY || ':99' }
  });
  console.log('[playwright][chromium] wsEndpoint =', server.wsEndpoint());

  // Lancer Firefox
  const firefoxServer = await firefox.launchServer({
    headless: false,
    args: [],
    env: { DISPLAY: process.env.DISPLAY || ':99' }
  });
  console.log('[playwright][firefox] wsEndpoint =', firefoxServer.wsEndpoint());

  process.stdin.resume();
})();
const fs = require('fs');
const { chromium, firefox } = require('playwright');

async function launchBrowser() {
  const browserName = process.env.BROWSER || 'chromium';
  const browserType = { chromium, firefox }[browserName];
  if (!browserType) {
    throw new Error(`Unsupported BROWSER value: ${browserName}`);
  }

  const options = { headless: process.env.HEADLESS !== 'false' };
  const localChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (process.env.PLAYWRIGHT_EXECUTABLE_PATH) {
    options.executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
  } else if (browserName === 'chromium' && fs.existsSync(localChrome)) {
    options.executablePath = localChrome;
  }
  return browserType.launch(options);
}

async function login(page) {
  const baseUrl = process.env.GLPI_URL || 'http://127.0.0.1:8088';
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.fill('input[name="login_name"]', process.env.GLPI_USER || 'glpi');
  await page.fill('input[name="login_password"]', process.env.GLPI_PASSWORD || 'glpi');
  await page.click('button[type="submit"], input[type="submit"]');
  await page.waitForLoadState('networkidle');
}

module.exports = { launchBrowser, login };

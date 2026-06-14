const fs = require('fs');
const { chromium, firefox, webkit } = require('playwright');

async function launchBrowser() {
  const browserName = process.env.BROWSER || 'chromium';
  const browserType = { chromium, firefox, webkit }[browserName];
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

async function createComputer(page, fields = {}) {
  const baseUrl = process.env.GLPI_URL || 'http://127.0.0.1:8088';
  await page.goto(`${baseUrl}/front/computer.form.php?id=-1`, {
    waitUntil: 'networkidle',
  });
  await page.fill('input[name="name"]', fields.name || `LABEL-PC-${Date.now()}`);
  if (fields.assetNumber) {
    await page.fill('input[name="otherserial"]', fields.assetNumber);
  }
  if (fields.serial) {
    await page.fill('input[name="serial"]', fields.serial);
  }
  await page.locator('button[name="add"], input[name="add"]').click();
  await page.waitForLoadState('networkidle');
  return Number(new URL(page.url()).searchParams.get('id'));
}

async function purgeComputer(page, computerId) {
  const baseUrl = process.env.GLPI_URL || 'http://127.0.0.1:8088';
  await page.goto(`${baseUrl}/front/computer.form.php?id=${computerId}`, {
    waitUntil: 'networkidle',
  });
  let token = await page.locator('input[name="_glpi_csrf_token"]').last().inputValue();
  const deleted = await page.request.post(`${baseUrl}/front/computer.form.php`, {
    form: {
      id: String(computerId),
      delete: '1',
      _glpi_csrf_token: token,
    },
    maxRedirects: 0,
  });
  if (![200, 302, 303].includes(deleted.status())) {
    return deleted;
  }

  await page.goto(`${baseUrl}/front/computer.form.php?id=${computerId}`, {
    waitUntil: 'networkidle',
  });
  token = await page.locator('input[name="_glpi_csrf_token"]').last().inputValue();
  return page.request.post(`${baseUrl}/front/computer.form.php`, {
    form: {
      id: String(computerId),
      purge: '1',
      _glpi_csrf_token: token,
    },
    maxRedirects: 0,
  });
}

module.exports = {
  createComputer,
  launchBrowser,
  login,
  purgeComputer,
};

const jsQR = require('jsqr');
const { PNG } = require('pngjs');
const { launchBrowser, login } = require('./helpers');

const baseUrl = process.env.GLPI_URL || 'http://127.0.0.1:8088';

(async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } });
  const errors = [];
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('response', response => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });

  await login(page);
  await page.goto(`${baseUrl}/front/computer.form.php?id=-1`, { waitUntil: 'networkidle' });
  const suffix = Date.now();
  const name = `LABEL-PC-${suffix}`;
  const assetNumber = `ASSET-${suffix}`;
  const serial = `SERIAL-${suffix}`;
  await page.fill('input[name="name"]', name);
  await page.fill('input[name="otherserial"]', assetNumber);
  await page.fill('input[name="serial"]', serial);
  await page.locator('button[name="add"], input[name="add"]').click();
  await page.waitForLoadState('networkidle');
  const computerId = Number(new URL(page.url()).searchParams.get('id'));

  const directAction = page.locator('a[aria-label="Print asset label"]');
  const directActionVisible = await directAction.isVisible();
  const directActionInHeader = await directAction.evaluate(
    element => element.parentElement?.id === 'header-friendlyname',
  );
  const directActionIsCompact = await directAction.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    return bounds.width <= 40 && bounds.height <= 40;
  });
  const printTabVisible = (await page.locator('body').innerText()).includes('Print label');
  await directAction.click();
  await page.waitForLoadState('networkidle');

  const defaultText = await page.locator('.assetlabel-label').innerText();
  const qrSource = await page.locator('.assetlabel-qr').getAttribute('src');
  const qrPng = PNG.sync.read(Buffer.from(qrSource.split(',')[1], 'base64'));
  const decodedQr = jsQR(
    new Uint8ClampedArray(qrPng.data),
    qrPng.width,
    qrPng.height,
  )?.data;
  const defaultSize = await page.locator('.assetlabel-label').evaluate(element => ({
    width: getComputedStyle(element).width,
    height: getComputedStyle(element).height,
  }));
  const previewHeight = await page.locator('.assetlabel-preview-stage').evaluate(
    element => element.getBoundingClientRect().height,
  );

  await page.uncheck('input[name="serial"]');
  await page.check('input[name="type"]');
  await page.selectOption('select[name="format"]', '50x25');
  await page.locator('button[type="submit"]', { hasText: 'Update preview' }).click();
  await page.waitForLoadState('networkidle');
  const changedText = await page.locator('.assetlabel-label').innerText();
  const printCss = await page.locator('#page style').innerText();

  await page.selectOption('select[name="format"]', 'custom');
  await page.fill('input[name="width"]', '80');
  await page.fill('input[name="height"]', '40');
  await page.uncheck('input[name="qr"]');
  await page.locator('button[type="submit"]', { hasText: 'Update preview' }).click();
  await page.waitForLoadState('networkidle');
  const customCss = await page.locator('#page style').innerText();
  const qrCount = await page.locator('.assetlabel-qr').count();

  await page.goto(
    `${baseUrl}/plugins/assetlabel/front/label.php?itemtype=Computer`
      + `&items_id=${computerId}&submitted=1&format=custom&width=999&height=1`,
    { waitUntil: 'networkidle' },
  );
  const boundedCss = await page.locator('#page style').innerText();
  await page.emulateMedia({ media: 'print' });
  const printView = {
    labelVisible: await page.locator('.assetlabel-label').isVisible(),
    toolbarVisible: await page.locator('.assetlabel-toolbar').isVisible(),
  };
  await page.emulateMedia({ media: 'screen' });

  const invalid = await page.request.get(
    `${baseUrl}/plugins/assetlabel/front/label.php?itemtype=User&items_id=1`,
    { maxRedirects: 0 },
  );

  await page.goto(`${baseUrl}/front/computer.form.php?id=${computerId}`, {
    waitUntil: 'networkidle',
  });
  const token = await page.locator('input[name="_glpi_csrf_token"]').last().inputValue();
  const cleanup = await page.request.post(`${baseUrl}/front/computer.form.php`, {
    form: {
      id: String(computerId),
      purge: '1',
      _glpi_csrf_token: token,
    },
    maxRedirects: 0,
  });

  const result = {
    direct_action_visible: directActionVisible,
    direct_action_in_header: directActionInHeader,
    direct_action_is_compact: directActionIsCompact,
    tab_visible: printTabVisible,
    defaults_present:
      defaultText.includes(name)
      && defaultText.includes(assetNumber)
      && defaultText.includes(serial),
    qr_is_png_data_uri: qrSource?.startsWith('data:image/png;base64,') || false,
    qr_opens_exact_asset:
      /^https?:\/\//.test(decodedQr || '')
      && decodedQr.endsWith(`/front/computer.form.php?id=${computerId}`),
    default_label_has_dimensions: defaultSize.width !== 'auto' && defaultSize.height !== 'auto',
    preview_window_is_compact: previewHeight <= 260,
    changed_fields_apply:
      changedText.includes('Computer') && !changedText.includes(serial),
    print_size_updates: printCss.includes('@page{size:50mm 25mm'),
    custom_size_updates: customCss.includes('@page{size:80mm 40mm'),
    custom_size_is_bounded: boundedCss.includes('@page{size:150mm 10mm'),
    qr_can_be_disabled: qrCount === 0,
    print_view_is_clean: printView.labelVisible && !printView.toolbarVisible,
    invalid_item_rejected: invalid.status() >= 400,
    cleanup_status: cleanup.status(),
    browser_errors: errors,
  };
  console.log(JSON.stringify(result, null, 2));
  await browser.close();

  if (
    !Object.entries(result)
      .filter(([key]) => !['cleanup_status', 'browser_errors'].includes(key))
      .every(([, value]) => value === true)
    || ![200, 302, 303].includes(result.cleanup_status)
    || result.browser_errors.length
  ) {
    process.exitCode = 1;
  }
})();

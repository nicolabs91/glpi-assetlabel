const jsQR = require('jsqr');
const { PNG } = require('pngjs');
const { launchBrowser, login, purgeComputer } = require('./helpers');

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

  const defaultText = await page.locator('main .assetlabel-label').innerText();
  const qrSource = await page.locator('main .assetlabel-qr').getAttribute('src');
  const qrPng = PNG.sync.read(Buffer.from(qrSource.split(',')[1], 'base64'));
  const decodedQr = jsQR(
    new Uint8ClampedArray(qrPng.data),
    qrPng.width,
    qrPng.height,
  )?.data;
  const defaultSize = await page.locator('main .assetlabel-label').evaluate(element => ({
    width: getComputedStyle(element).width,
    height: getComputedStyle(element).height,
  }));
  const previewHeight = await page.locator('.assetlabel-preview-stage').evaluate(
    element => element.getBoundingClientRect().height,
  );
  const previewWidth = await page.locator('.assetlabel-preview-card').evaluate(
    element => element.getBoundingClientRect().width,
  );

  await page.uncheck('input[name="serial"]');
  await page.check('input[name="type"]');
  await page.check('input[name="manufacturer"]');
  await page.selectOption('select[name="format"]', '50x25');
  await page.waitForFunction(() => (
    location.search.includes('format=50x25')
    && getComputedStyle(document.documentElement)
      .getPropertyValue('--assetlabel-width').trim() === '50mm'
    && getComputedStyle(document.documentElement)
      .getPropertyValue('--assetlabel-height').trim() === '25mm'
  ));
  const changedText = await page.locator('main .assetlabel-label').innerText();
  const printCss = await page.locator('#page style').innerText();
  const usesNativePrintPaper = await page.evaluate(() => (
    document.documentElement.classList.contains('assetlabel-safari-print')
  ));
  const liveUrl = page.url();

  await page.selectOption('select[name="format"]', 'custom');
  await page.fill('input[name="width"]', '80');
  await page.fill('input[name="height"]', '40');
  await page.uncheck('input[name="qr"]');
  const customCss = await page.locator('#page style').innerText();
  const qrVisible = await page.locator('main .assetlabel-qr').isVisible();
  await page.evaluate(() => {
    window.__assetlabelPrintCalls = 0;
    window.print = () => {
      window.__assetlabelPrintCalls += 1;
    };
  });
  await page.locator('.assetlabel-print-button').click();
  const printButtonCallsPrint = await page.evaluate(
    () => window.__assetlabelPrintCalls === 1,
  );

  await page.goto(
    `${baseUrl}/plugins/assetlabel/front/label.php?itemtype=Computer`
      + `&items_id=${computerId}&submitted=1&format=custom&width=999&height=1`,
    { waitUntil: 'networkidle' },
  );
  const boundedCss = await page.locator('#page style').innerText();
  const printRoot = page.locator('body > .assetlabel-print-root');
  const printRootIsDirectBodyChild = await printRoot.count() === 1;
  const printRootTextMatchesPreview = await page.evaluate(() => (
    document.querySelector('body > .assetlabel-print-root .assetlabel-label')
      ?.textContent
    === document.querySelector('main .assetlabel-label')?.textContent
  ));
  await page.emulateMedia({ media: 'print' });
  const printView = {
    labelVisible: await printRoot.locator('.assetlabel-label').isVisible(),
    toolbarVisible: await page.locator('.assetlabel-toolbar').isVisible(),
    labelAtPageOrigin: await printRoot.locator('.assetlabel-label').evaluate(element => {
      const bounds = element.getBoundingClientRect();
      return bounds.left === 0 && bounds.top === 0;
    }),
    visibleOutsideLabel: await page.locator('body').evaluate(body => (
      [...body.querySelectorAll('*')].filter(element => {
        if (element.matches(
          '.assetlabel-print-root, .assetlabel-print-root *',
        )) {
          return false;
        }
        const style = getComputedStyle(element);
        const bounds = element.getBoundingClientRect();
        return style.display !== 'none'
          && style.visibility !== 'hidden'
          && bounds.width > 0
          && bounds.height > 0;
      }).length
    )),
  };
  await page.emulateMedia({ media: 'screen' });

  const invalid = await page.request.get(
    `${baseUrl}/plugins/assetlabel/front/label.php?itemtype=User&items_id=1`,
    { maxRedirects: 0 },
  );

  await page.goto(
    `${baseUrl}/plugins/assetlabel/front/label.php`
      + '?itemtype=Computer&items_id=416&submitted=1&model=1&manufacturer=1',
    { waitUntil: 'networkidle' },
  );
  const productText = await page.locator('main .assetlabel-label').innerText();
  const productValuesHaveNoPrefix = (
    await page.locator(
      'main [data-assetlabel-field="model"] span, '
        + 'main [data-assetlabel-field="manufacturer"] span',
    ).count() === 0
  );

  const cleanup = await purgeComputer(page, computerId);

  const result = {
    direct_action_visible: directActionVisible,
    direct_action_in_header: directActionInHeader,
    direct_action_is_compact: directActionIsCompact,
    tab_visible: printTabVisible,
    defaults_present:
      defaultText.includes(name)
      && defaultText.includes(assetNumber)
      && defaultText.includes(serial),
    serial_label_is_abbreviated:
      defaultText.includes('S/N') && !defaultText.includes('Serial number'),
    model_and_manufacturer_values_have_no_prefix:
      productText.includes('Dell Latitude 5440')
      && productText.includes('Dell')
      && !productText.includes('Model')
      && !productText.includes('MFR')
      && !productText.includes('Manufacturer')
      && productValuesHaveNoPrefix,
    qr_is_png_data_uri: qrSource?.startsWith('data:image/png;base64,') || false,
    qr_opens_exact_asset:
      /^https?:\/\//.test(decodedQr || '')
      && decodedQr.endsWith(`/front/computer.form.php?id=${computerId}`),
    default_label_has_dimensions: defaultSize.width !== 'auto' && defaultSize.height !== 'auto',
    preview_window_is_compact: previewHeight <= 260,
    preview_window_is_narrow: previewWidth <= 400,
    changed_fields_apply:
      changedText.includes('Computer') && !changedText.includes(serial),
    print_size_updates: usesNativePrintPaper
      ? printCss.includes('@page{margin:0}')
        && !printCss.includes('@page{size:')
      : printCss.includes('@page{size:50mm 25mm'),
    preview_updates_without_reload:
      liveUrl.includes('format=50x25') && liveUrl.includes('type=1'),
    custom_size_updates: usesNativePrintPaper
      ? customCss.includes('--assetlabel-width:80mm;--assetlabel-height:40mm')
      : customCss.includes('@page{size:80mm 40mm'),
    custom_size_is_bounded: usesNativePrintPaper
      ? boundedCss.includes('--assetlabel-width:150mm;--assetlabel-height:10mm')
      : boundedCss.includes('@page{size:150mm 10mm'),
    qr_can_be_disabled: !qrVisible,
    print_button_calls_print: printButtonCallsPrint,
    print_view_is_clean:
      printView.labelVisible
      && !printView.toolbarVisible
      && printView.labelAtPageOrigin
      && printView.visibleOutsideLabel === 0,
    print_root_is_direct_body_child: printRootIsDirectBodyChild,
    print_root_matches_live_preview: printRootTextMatchesPreview,
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

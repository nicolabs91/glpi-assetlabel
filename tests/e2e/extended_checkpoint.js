const {
  createComputer,
  launchBrowser,
  login,
  purgeComputer,
} = require('./helpers');

const baseUrl = process.env.GLPI_URL || 'http://127.0.0.1:8088';

function allTrue(result, ignored = []) {
  return Object.entries(result)
    .filter(([key]) => !ignored.includes(key))
    .every(([, value]) => value === true);
}

(async () => {
  const browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 1500, height: 1100 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('response', response => {
    if (response.status() >= 500) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });

  await login(page);
  const suffix = Date.now();
  const name = `LABEL & <special> "quoted" ${suffix}`;
  const assetNumber = `ASSET-${'X'.repeat(90)}-${suffix}`;
  const serial = `SERIAL-${'Y'.repeat(90)}-${suffix}`;
  const computerId = await createComputer(page, { name, assetNumber, serial });
  const labelUrl = `${baseUrl}/plugins/assetlabel/front/label.php`
    + `?itemtype=Computer&items_id=${computerId}`;

  try {
    await page.goto(labelUrl, { waitUntil: 'networkidle' });
    const initialText = await page.locator('main .assetlabel-label').innerText();
    const escapedTextIsLiteral = initialText.includes(name)
      && await page.locator('main .assetlabel-label script').count() === 0;
    const contentStaysInsideLabel = await page.locator('main .assetlabel-label').evaluate(element => (
      element.scrollWidth <= element.clientWidth
    ));

    const presetResults = {};
    await page.selectOption('select[name="orientation"]', 'landscape');
    for (const [format, dimensions] of Object.entries({
      '62x29': ['62mm', '29mm'],
      '50x25': ['50mm', '25mm'],
      '70x37': ['70mm', '37mm'],
    })) {
      await page.selectOption('select[name="format"]', format);
      await page.waitForFunction(expected => (
        getComputedStyle(document.documentElement)
          .getPropertyValue('--assetlabel-width').trim() === expected[0]
        && getComputedStyle(document.documentElement)
          .getPropertyValue('--assetlabel-height').trim() === expected[1]
      ), dimensions);
      presetResults[format] = await page.evaluate(expected => (
        getComputedStyle(document.documentElement)
          .getPropertyValue('--assetlabel-width').trim() === expected[0]
        && getComputedStyle(document.documentElement)
          .getPropertyValue('--assetlabel-height').trim() === expected[1]
      ), dimensions);
    }
    await page.selectOption('select[name="orientation"]', 'portrait');
    await page.selectOption('select[name="format"]', '70x37');
    await page.waitForFunction(() => (
      getComputedStyle(document.documentElement)
        .getPropertyValue('--assetlabel-width').trim() === '37mm'
      && getComputedStyle(document.documentElement)
        .getPropertyValue('--assetlabel-height').trim() === '70mm'
    ));
    const portraitPresetSwapsDimensions = await page.evaluate(() => (
      getComputedStyle(document.documentElement)
        .getPropertyValue('--assetlabel-width').trim() === '37mm'
      && getComputedStyle(document.documentElement)
        .getPropertyValue('--assetlabel-height').trim() === '70mm'
    ));

    const fieldCheckboxes = page.locator(
      '#assetlabel-settings input[type="checkbox"]:not([name="qr"])',
    );
    for (let iteration = 0; iteration < 5; iteration += 1) {
      const checkboxCount = await fieldCheckboxes.count();
      for (let index = 0; index < checkboxCount; index += 1) {
        const checkbox = fieldCheckboxes.nth(index);
        if (iteration % 2 === 0) {
          await checkbox.uncheck();
        } else {
          await checkbox.check();
        }
      }
    }
    const emptyStateVisible = await page.locator('main .assetlabel-empty').isVisible();
    await page.check('input[name="name"]');
    const emptyStateClears = !(await page.locator('main .assetlabel-empty').isVisible());
    const oneFieldVisible = (
      await page.locator('main [data-assetlabel-field]:visible').count() === 1
    );

    await page.selectOption('select[name="format"]', 'custom');
    await page.fill('input[name="width"]', '33.5');
    await page.fill('input[name="height"]', '17.5');
    await page.uncheck('input[name="qr"]');
    await page.reload({ waitUntil: 'networkidle' });
    const stateSurvivesReload = (
      await page.inputValue('input[name="width"]') === '33.5'
      && await page.inputValue('input[name="height"]') === '17.5'
      && await page.inputValue('select[name="orientation"]') === 'landscape'
      && await page.locator('input[name="name"]').isChecked()
      && !(await page.locator('input[name="serial"]').isChecked())
      && !(await page.locator('input[name="qr"]').isChecked())
    );

    const malformedCases = [
      ['format=custom&width=-10&height=not-a-number', ['20mm', '10mm']],
      ['format=custom&width=1e3&height=999', ['150mm', '100mm']],
      ['format%5B%5D=custom&width%5B%5D=99&height%5B%5D=99', ['20mm', '10mm']],
      ['format=unknown&width=20.5&height=10.5', ['20.5mm', '10.5mm']],
      ['format=62x29&orientation=portrait', ['29mm', '62mm']],
    ];
    const malformedInputsAreBounded = [];
    for (const [query, expected] of malformedCases) {
      await page.goto(`${labelUrl}&submitted=1&${query}`, { waitUntil: 'networkidle' });
      malformedInputsAreBounded.push(
        await page.evaluate(value => (
          getComputedStyle(document.documentElement)
            .getPropertyValue('--assetlabel-width').trim() === value[0]
          && getComputedStyle(document.documentElement)
            .getPropertyValue('--assetlabel-height').trim() === value[1]
        ), expected),
      );
    }

    const malformedItemType = await page.request.get(
      `${baseUrl}/plugins/assetlabel/front/label.php`
        + '?itemtype%5B%5D=Computer&items_id=1',
      { maxRedirects: 0 },
    );

    const cookies = await context.cookies();
    const noJsContext = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 1200, height: 900 },
    });
    await noJsContext.addCookies(cookies);
    const noJsPage = await noJsContext.newPage();
    await noJsPage.goto(labelUrl, { waitUntil: 'networkidle' });
    await noJsPage.selectOption('select[name="format"]', '50x25');
    await noJsPage.uncheck('input[name="serial"]');
    await noJsPage.check('input[name="type"]');
    await noJsPage.locator('noscript button[type="submit"]').click();
    await noJsPage.waitForLoadState('networkidle');
    const noJsText = await noJsPage.locator('main .assetlabel-label').innerText();
    const noJsFallbackWorks = (
      noJsText.includes('Computer')
      && !noJsText.includes(serial)
      && (await noJsPage.locator('#assetlabel-page-size').innerText()).includes('50mm 25mm')
    );
    await noJsContext.close();

    const anonymousContext = await browser.newContext();
    const anonymousPage = await anonymousContext.newPage();
    await anonymousPage.goto(labelUrl, { waitUntil: 'networkidle' });
    const anonymousAccessRequiresLogin = (
      (
        anonymousPage.url().includes('error=3')
        || await anonymousPage.locator('input[name="login_name"]').count() === 1
      )
      && await anonymousPage.locator('main .assetlabel-label').count() === 0
    );
    await anonymousContext.close();

    await page.goto(`${baseUrl}/front/computer.form.php?id=${computerId}`, {
      waitUntil: 'networkidle',
    });
    for (let iteration = 0; iteration < 4; iteration += 1) {
      await page.locator('#header-friendlyname').evaluate(element => {
        element.append(document.createElement('span'));
      });
    }
    await page.waitForTimeout(100);
    const headerActionIsNotDuplicated = (
      await page.locator('#header-friendlyname > .assetlabel-header-action').count() === 1
    );

    const result = {
      special_text_is_escaped: escapedTextIsLiteral,
      long_text_has_no_horizontal_overflow: contentStaysInsideLabel,
      every_preset_updates_live: Object.values(presetResults).every(Boolean),
      portrait_preset_swaps_dimensions: portraitPresetSwapsDimensions,
      repeated_toggle_loop_is_stable:
        emptyStateVisible && emptyStateClears && oneFieldVisible,
      settings_survive_reload: stateSurvivesReload,
      malformed_dimensions_are_bounded: malformedInputsAreBounded.every(Boolean),
      malformed_itemtype_is_rejected: malformedItemType.status() >= 400,
      no_javascript_fallback_works: noJsFallbackWorks,
      anonymous_access_requires_login: anonymousAccessRequiresLogin,
      header_action_is_not_duplicated: headerActionIsNotDuplicated,
      browser_errors: errors,
    };
    console.log(JSON.stringify(result, null, 2));
    if (!allTrue(result, ['browser_errors']) || result.browser_errors.length) {
      process.exitCode = 1;
    }
  } finally {
    const cleanup = await purgeComputer(page, computerId);
    if (![200, 302, 303].includes(cleanup.status())) {
      console.error(`Cleanup failed with HTTP ${cleanup.status()}`);
      process.exitCode = 1;
    }
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

const AxeBuilder = require('@axe-core/playwright').default;
const { launchBrowser, login, purgeComputer } = require('./helpers');

const baseUrl = process.env.GLPI_URL || 'http://127.0.0.1:8088';

(async () => {
  const browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 1500, height: 1100 } });
  const page = await context.newPage();
  await login(page);

  await page.goto(`${baseUrl}/front/computer.form.php?id=-1`, { waitUntil: 'networkidle' });
  const name = `LABEL-A11Y-${Date.now()}`;
  await page.fill('input[name="name"]', name);
  await page.fill('input[name="otherserial"]', `A11Y-${Date.now()}`);
  await page.locator('button[name="add"], input[name="add"]').click();
  await page.waitForLoadState('networkidle');
  const computerId = Number(new URL(page.url()).searchParams.get('id'));

  await page.goto(
    `${baseUrl}/plugins/assetlabel/front/label.php?itemtype=Computer&items_id=${computerId}`,
    { waitUntil: 'networkidle' },
  );

  const results = await new AxeBuilder({ page })
    .include('.assetlabel-page')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const cleanup = await purgeComputer(page, computerId);

  const output = {
    violations: results.violations.map(violation => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.length,
      targets: violation.nodes.map(node => node.target),
    })),
    cleanup_status: cleanup.status(),
  };
  console.log(JSON.stringify(output, null, 2));
  await browser.close();
  if (output.violations.length || ![200, 302, 303].includes(output.cleanup_status)) {
    process.exitCode = 1;
  }
})();

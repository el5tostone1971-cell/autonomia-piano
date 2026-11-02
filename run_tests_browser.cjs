const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(process.env.APP_URL || 'http://127.0.0.1:10000/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.selectLibraryPiece === 'function', null, { timeout: 20000 });
    await page.addScriptTag({ url: '/run_tests.js' });
    await page.waitForFunction(() => Array.isArray(window.__TEST_RESULTS), null, { timeout: 120000 });
    const results = await page.evaluate(() => window.__TEST_RESULTS);
    const failed = results.filter(result => !result.ok);
    console.log(results.map(result => (result.ok ? 'PASS ' : 'FAIL ') + result.name + (result.detail ? ' :: ' + result.detail : '')).join('\\n'));
    console.log('TOTAL: ' + results.length + ' | PASS: ' + (results.length - failed.length) + ' | FAIL: ' + failed.length);
    assert.deepEqual(errors, [], 'Errores JavaScript en navegador: ' + errors.join(' | '));
    assert.equal(failed.length, 0, 'Fallaron pruebas: ' + failed.map(result => result.name).join(', '));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

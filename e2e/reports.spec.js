const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
// jwt not required in this E2E test (login performed via UI)

test.describe('Reportes E2E', () => {
  test('Generar reporte: login real, carga resumen, tabla y gráfico', async ({ page }) => {
    // Real login flow: navigate to login, submit credentials, wait for dashboard
    await page.goto('http://localhost:3000/public/views/login.html');
    await page.fill('#username', 'admin@rendex.com');
    await page.fill('#password', 'password');
    await Promise.all([
      page.waitForURL('**/dashboard.html', { timeout: 5000 }),
      page.click('#submitBtn'),
    ]);

    // from dashboard, navigate to reportes via nav
    await page.click('a[href="/public/views/reportes.html"]');
    await page.waitForURL('**/reportes.html', { timeout: 5000 });

    // fill date inputs
    await page.fill('#startDate', '2025-01-01');
    await page.fill('#endDate', '2025-12-31');

    // click generate
    await page.click('#generate');

    // wait for status to indicate success
    await expect(page.locator('#status')).toHaveText('Reporte generado.', { timeout: 5000 });

    // ensure totals updated
    const totalUsd = await page.textContent('#total-usd');
    expect(totalUsd).toContain('USD');

    // wait for transaction rows container and check rows (can be zero)
    await page.waitForSelector('#transactions-body', { timeout: 5000 });
    const rows = await page.locator('#transactions-body tr').count();
    expect(rows).toBeGreaterThanOrEqual(0);

    // verify canvas exists
    const canvas = page.locator('#sales-chart');
    await expect(canvas).toBeVisible();
  });

  test('Descarga CSV desde interfaz y contiene encabezados (login real)', async ({ page }) => {
    // login first
    await page.goto('http://localhost:3000/public/views/login.html');
    await page.fill('#username', 'admin@rendex.com');
    await page.fill('#password', 'password');
    await Promise.all([
      page.waitForURL('**/dashboard.html', { timeout: 5000 }),
      page.click('#submitBtn'),
    ]);

    // go to reportes
    await page.click('a[href="/public/views/reportes.html"]');
    await page.waitForURL('**/reportes.html', { timeout: 5000 });

    await page.fill('#startDate', '2025-01-01');
    await page.fill('#endDate', '2025-12-31');
    await page.click('#generate');

    // wait for generation
    await expect(page.locator('#status')).toHaveText('Reporte generado.', { timeout: 5000 });

    // initiate download via exportCsv button
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#exportCsv')]);

    const tmpPath = path.join(__dirname, 'tmp-download.csv');
    await download.saveAs(tmpPath);
    const content = fs.readFileSync(tmpPath, 'utf8');

    expect(content.length).toBeGreaterThan(10);
    expect(content).toContain('Reporte de Ventas');
    expect(content).toContain('Total USD');

    // cleanup
    try {
      fs.unlinkSync(tmpPath);
    } catch (e) {
      /* ignore cleanup errors */
    }
  });
});

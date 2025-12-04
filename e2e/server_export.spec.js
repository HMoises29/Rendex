const { test, expect } = require('@playwright/test');
const { fetch } = require('undici');
const jwt = require('jsonwebtoken');

// This test performs a direct HTTP request to the server streaming CSV endpoint
test('Servidor: GET /api/reports/sales-export devuelve CSV válido', async () => {
  const token = jwt.sign({ id: 'e2e-user', role: 'gerente' }, 'change_me');
  const url = 'http://localhost:3000/api/reports/sales-export?startDate=2025-01-01&endDate=2025-12-31';

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'text/csv',
    },
  });

  expect(res.status).toBe(200);
  const contentType = res.headers.get('content-type') || '';
  expect(contentType).toMatch(/text\/csv/);

  const disposition = res.headers.get('content-disposition') || '';
  expect(disposition).toContain('attachment');

  // read a chunk of the body to validate structure; read full text for simplicity in test
  const text = await res.text();
  expect(text.length).toBeGreaterThan(10);

  // Validate CSV has header row and at least one column name we expect
  const firstLine = text.split('\n')[0] || '';
  expect(firstLine).toContain('uuid');
  expect(firstLine).toContain('total_usd_cents');
  expect(firstLine).toContain('created_at');
});

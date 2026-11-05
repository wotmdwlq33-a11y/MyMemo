import { expect, test } from '@playwright/test';
import { gotoApp } from './helpers';

test('serves a web app manifest', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest');
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest.name).toBe('MyMemo');
  expect(manifest.icons.length).toBeGreaterThan(0);
});

test('loads offline after the first visit, even after opening a non-app URL', async ({ page, context }) => {
  await gotoApp(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // now controlled by the service worker
  await page.goto('/manifest.webmanifest');

  await context.setOffline(true);
  await page.goto('/');
  await expect(page.getByRole('button', { name: '새 메모' })).toBeVisible();
  await context.setOffline(false);
});

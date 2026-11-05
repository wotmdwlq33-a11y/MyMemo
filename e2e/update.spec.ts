import { expect, test, type Page } from '@playwright/test';
import { gotoApp } from './helpers';

// Simulates registerServiceWorker announcing a waiting worker, using a fake
// registration so the test does not depend on real service-worker update timing.
async function announceFakeUpdate(page: Page, { withWaiting = true } = {}): Promise<void> {
  await page.evaluate((withWaiting) => {
    const w = window as unknown as { __swMessages: unknown[] };
    w.__swMessages = [];
    const registration = {
      waiting: withWaiting ? { postMessage: (msg: unknown) => w.__swMessages.push(msg) } : null,
    };
    window.dispatchEvent(new CustomEvent('mymemo:sw-update', { detail: registration }));
  }, withWaiting);
}

function updatePrompt(page: Page) {
  return page.getByRole('status').filter({ hasText: '새 버전이 준비되었습니다' });
}

test('no update prompt on a normal load', async ({ page }) => {
  await gotoApp(page);
  await expect(page.getByText('새 버전이 준비되었습니다')).toHaveCount(0);
});

test('shows the update prompt and can be dismissed', async ({ page }) => {
  await gotoApp(page);
  await announceFakeUpdate(page);
  const prompt = updatePrompt(page);
  await expect(prompt).toBeVisible();
  await prompt.getByRole('button', { name: '업데이트 알림 닫기' }).click();
  await expect(page.getByText('새 버전이 준비되었습니다')).toHaveCount(0);
});

test('새로고침 asks the waiting worker to skip waiting', async ({ page }) => {
  await gotoApp(page);
  await announceFakeUpdate(page);
  const button = updatePrompt(page).getByRole('button', { name: '새로고침' });
  await button.click();
  await expect(button).toBeDisabled();
  expect(await page.evaluate(() => (window as unknown as { __swMessages: unknown[] }).__swMessages)).toEqual([
    { type: 'SKIP_WAITING' },
  ]);
});

test('새로고침 reloads directly when nothing is waiting any more', async ({ page }) => {
  await gotoApp(page);
  await page.evaluate(() => ((window as unknown as { __marker: boolean }).__marker = true));
  await announceFakeUpdate(page, { withWaiting: false });
  await Promise.all([
    page.waitForEvent('load'),
    updatePrompt(page).getByRole('button', { name: '새로고침' }).click(),
  ]);
  await expect(page.getByRole('button', { name: '새 메모' })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __marker?: boolean }).__marker)).toBeUndefined();
  await expect(page.getByText('새 버전이 준비되었습니다')).toHaveCount(0);
});

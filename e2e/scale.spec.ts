import { expect, test } from '@playwright/test';
import { STORAGE_KEY, searchInput } from './helpers';

test('large lists render in pages and load more on demand', async ({ page }) => {
  await page.addInitScript(key => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    const notes = Array.from({ length: 500 }, (_, i) => ({
      id: i + 1,
      title: `대량 메모 ${i + 1}`,
      body: '',
      tags: [],
      createdAt: new Date(1_700_000_000_000 + i * 60_000).toISOString(),
      updatedAt: new Date(1_700_000_000_000 + i * 60_000).toISOString(),
      pinned: false,
      archived: false,
    }));
    localStorage.setItem(key, JSON.stringify(notes));
  }, STORAGE_KEY);
  await page.goto('/');

  const cards = page.getByTestId('note-card');
  await expect(cards).toHaveCount(60);
  await expect(page.getByText('· 500개')).toBeVisible();

  // The button works (scrolling it into view may also trigger auto-loading).
  await page.getByRole('button', { name: /더 보기 \(440개 남음\)/ }).click();
  await expect.poll(() => cards.count()).toBeGreaterThanOrEqual(120);

  // Scrolling to the end keeps loading until everything is shown.
  await expect(async () => {
    await page.mouse.wheel(0, 100_000);
    expect(await cards.count()).toBe(500);
  }).toPass();
  await expect(page.getByRole('button', { name: /더 보기/ })).toHaveCount(0);

  // A new query starts from the first page again.
  await page.evaluate(() => window.scrollTo(0, 0));
  await searchInput(page).fill('대량 메모 1');
  await expect(cards).toHaveCount(60);
});

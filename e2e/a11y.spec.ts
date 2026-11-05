import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { gotoApp } from './helpers';

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme });

    test('main screen has no detectable a11y violations', async ({ page }) => {
      await gotoApp(page);
      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([]);
    });

    test('empty states have no detectable a11y violations', async ({ page }) => {
      await gotoApp(page);
      await page.getByRole('button', { name: /보관함/ }).click();
      await expect(page.getByText('보관된 메모가 없습니다.')).toBeVisible();
      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([]);
    });

    test('note dialog has no detectable a11y violations', async ({ page }) => {
      await gotoApp(page);
      await page.getByRole('button', { name: '새 메모' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.waitForTimeout(400); // let the open animation settle
      const { violations } = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
      expect(violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)).toEqual([]);
    });
  });
}

test('tag manager has no detectable a11y violations', async ({ page }) => {
  await gotoApp(page);
  await page.getByRole('button', { name: '태그 관리' }).click();
  await page.waitForTimeout(400);
  const { violations } = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
  expect(violations.map(v => v.id)).toEqual([]);
});

import { expect, test } from '@playwright/test';
import { addNote, gotoApp, noteCard, searchInput } from './helpers';

const cardTitles = (page: import('@playwright/test').Page) =>
  page.getByTestId('note-card').locator('h3').allInnerTexts();

test('pinned notes stay on top and persist', async ({ page }) => {
  await gotoApp(page);
  await page.getByRole('button', { name: "'읽어야 할 책 리스트' 고정", exact: true }).click();
  expect((await cardTitles(page))[0]).toBe('읽어야 할 책 리스트');

  await addNote(page, { title: '새로 만든 메모' });
  expect((await cardTitles(page)).slice(0, 2)).toEqual(['읽어야 할 책 리스트', '새로 만든 메모']);

  await page.reload();
  expect((await cardTitles(page))[0]).toBe('읽어야 할 책 리스트');
  await expect(page.getByRole('button', { name: "'읽어야 할 책 리스트' 고정 해제" })).toHaveAttribute('aria-pressed', 'true');
});

test('archiving moves a note to the archive view and back', async ({ page }) => {
  await gotoApp(page);
  await page.getByRole('button', { name: "'프로젝트 아이디어' 보관", exact: true }).click();
  await expect(noteCard(page, '프로젝트 아이디어')).toHaveCount(0);

  await page.getByRole('button', { name: /보관함/ }).click();
  await expect(noteCard(page, '프로젝트 아이디어')).toBeVisible();
  await expect(page.getByTestId('note-card')).toHaveCount(1);

  await page.getByRole('button', { name: "'프로젝트 아이디어' 보관 해제" }).click();
  await expect(page.getByText('보관된 메모가 없습니다.')).toBeVisible();
  await page.getByRole('button', { name: /^전체/ }).click();
  await expect(noteCard(page, '프로젝트 아이디어')).toBeVisible();
});

test('tag chips combine filters and can be removed', async ({ page }) => {
  await gotoApp(page);
  await addNote(page, { title: '디자인 회고', tags: '디자인, 회고' });

  await page.getByRole('navigation', { name: '메모 분류' }).getByRole('button', { name: /^디자인/ }).click();
  await expect(page.getByTestId('note-card')).toHaveCount(2);
  await page.getByTestId('note-card').getByRole('button', { name: '#회고', exact: true }).click();
  await expect(page.getByTestId('note-card')).toHaveCount(1);
  await expect(noteCard(page, '디자인 회고')).toBeVisible();

  await page.getByRole('button', { name: '태그 필터 해제: 회고' }).click();
  await page.getByRole('button', { name: '태그 필터 해제: 디자인' }).click();
  await expect(page.getByTestId('note-card')).toHaveCount(4);
});

test('highlights search matches', async ({ page }) => {
  await gotoApp(page);
  await searchInput(page).fill('가이드');
  await expect(page.locator('mark', { hasText: '가이드' }).first()).toBeVisible();
});

test('sorts by title and remembers the choice', async ({ page }) => {
  await gotoApp(page);
  await page.getByRole('combobox', { name: '정렬' }).selectOption('title');
  expect(await cardTitles(page)).toEqual(['시안 작업 가이드', '읽어야 할 책 리스트', '프로젝트 아이디어']);
  await page.reload();
  await expect(page.getByRole('combobox', { name: '정렬' })).toHaveValue('title');
});

test('theme follows the system and can be toggled', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await gotoApp(page);
  const html = page.locator('html');
  await expect(html).toHaveClass(/dark/);

  await page.getByRole('button', { name: /테마: 시스템/ }).click(); // → light
  await expect(html).not.toHaveClass(/dark/);
  await page.getByRole('button', { name: /테마: 라이트/ }).click(); // → dark
  await expect(html).toHaveClass(/dark/);

  await page.emulateMedia({ colorScheme: 'light' });
  await page.reload();
  await expect(html).toHaveClass(/dark/); // explicit choice wins over the system
});

test('keyboard shortcuts: "/" focuses search and "n" opens a new note', async ({ page }) => {
  await gotoApp(page);
  await page.keyboard.press('/');
  await expect(searchInput(page)).toBeFocused();
  await searchInput(page).press('n'); // typing in the field must not open the dialog
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await searchInput(page).blur();
  await page.keyboard.press('n');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByLabel('제목')).toBeFocused();
});

test('focus stays inside the note dialog and returns to the opener', async ({ page }) => {
  await gotoApp(page);
  const opener = page.getByRole('button', { name: '새 메모' });
  await opener.click();
  const dialog = page.getByRole('dialog');
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

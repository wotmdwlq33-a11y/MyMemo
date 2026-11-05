import { expect, test } from '@playwright/test';
import { addNote, gotoApp, readStoredNotes } from './helpers';

test('renames, merges and deletes tags across notes', async ({ page }) => {
  await gotoApp(page);
  await addNote(page, { title: '회의록', tags: '업무, 회의' });

  await page.getByRole('button', { name: '태그 관리' }).click();
  const dialog = page.getByRole('dialog', { name: '태그 관리' });

  // Rename 업무 → 회사 (applies to both notes that had it).
  await dialog.getByRole('button', { name: "'업무' 태그 이름 바꾸기" }).click();
  await dialog.getByLabel("'업무' 태그의 새 이름").fill('회사');
  await dialog.getByLabel("'업무' 태그의 새 이름").press('Enter');
  await expect(dialog.getByText('#회사')).toBeVisible();

  // Merge 회의 into 회사 after confirming.
  page.once('dialog', d => void d.accept());
  await dialog.getByRole('button', { name: "'회의' 태그 이름 바꾸기" }).click();
  await dialog.getByLabel("'회의' 태그의 새 이름").fill('회사');
  await dialog.getByRole('button', { name: '이름 저장' }).click();
  await expect(dialog.getByText('#회의')).toHaveCount(0);

  // Delete 개발; the note stays.
  page.once('dialog', d => void d.accept());
  await dialog.getByRole('button', { name: "'개발' 태그 삭제" }).click();
  await expect(dialog.getByText('#개발')).toHaveCount(0);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: '태그 관리' })).toBeFocused();

  const stored = await readStoredNotes(page);
  expect(stored.find(n => n.title === '회의록')?.tags).toEqual(['회사']);
  expect(stored.find(n => n.title === '프로젝트 아이디어')?.tags).toEqual(['회사']);
  expect(stored.flatMap(n => n.tags)).not.toContain('개발');
  expect(stored).toHaveLength(4);
});

test('rejects tag names containing commas', async ({ page }) => {
  await gotoApp(page);
  await page.getByRole('button', { name: '태그 관리' }).click();
  const dialog = page.getByRole('dialog', { name: '태그 관리' });
  await dialog.getByRole('button', { name: "'독서' 태그 이름 바꾸기" }).click();
  await dialog.getByLabel("'독서' 태그의 새 이름").fill('a,b');
  await expect(dialog.getByRole('alert')).toContainText('쉼표');
  await expect(dialog.getByRole('button', { name: '이름 저장' })).toBeDisabled();
});

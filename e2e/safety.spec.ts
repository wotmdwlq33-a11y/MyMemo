import { expect, test } from '@playwright/test';
import { STORAGE_KEY, addNote, fillNoteForm, gotoApp, noteCard, noteDialog, readStoredNotes } from './helpers';

test('changes in one tab show up in another and are not overwritten', async ({ context }) => {
  const a = await context.newPage();
  const b = await context.newPage();
  await gotoApp(a);
  await gotoApp(b);

  await addNote(a, { title: '탭 A에서 작성' });
  await expect(noteCard(b, '탭 A에서 작성')).toBeVisible();

  await addNote(b, { title: '탭 B에서 작성' });
  await expect(noteCard(a, '탭 B에서 작성')).toBeVisible();
  const titles = (await readStoredNotes(a)).map(n => n.title);
  expect(titles).toEqual(expect.arrayContaining(['탭 A에서 작성', '탭 B에서 작성']));
});

test('Escape asks before discarding unsaved text', async ({ page }) => {
  await gotoApp(page);
  await page.getByRole('button', { name: '새 메모' }).click();
  await fillNoteForm(page, { title: '쓰다 만 메모' });

  page.once('dialog', d => void d.dismiss());
  await page.keyboard.press('Escape');
  await expect(noteDialog(page)).toBeVisible();
  await expect(noteDialog(page).getByLabel('제목')).toHaveValue('쓰다 만 메모');

  page.once('dialog', d => void d.accept());
  await page.keyboard.press('Escape');
  await expect(noteDialog(page)).toBeHidden();
});

test('Escape closes an untouched dialog without asking', async ({ page }) => {
  await gotoApp(page);
  page.on('dialog', () => {
    throw new Error('no confirm expected');
  });
  await page.getByRole('button', { name: '새 메모' }).click();
  await page.keyboard.press('Escape');
  await expect(noteDialog(page)).toBeHidden();
});

test('offers the corrupt-data backup for download', async ({ page }) => {
  await page.addInitScript(key => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem(key, '{broken');
      sessionStorage.setItem('seeded', '1');
    }
  }, STORAGE_KEY);
  await gotoApp(page);
  const banner = page.getByRole('alert').filter({ hasText: '저장된 메모 데이터를 읽지 못했습니다' });
  await expect(banner).toBeVisible();

  const download = page.waitForEvent('download');
  await banner.getByRole('button', { name: '백업 파일 받기' }).click();
  expect((await download).suggestedFilename()).toBe('mymemo-corrupt-backup.txt');

  page.once('dialog', d => void d.accept());
  await banner.getByRole('button', { name: '백업 삭제' }).click();
  await expect(banner).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('저장된 메모 데이터를 읽지 못했습니다')).toHaveCount(0);
});

import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { SEED_TITLES, STORAGE_KEY, addNote, gotoApp, noteCard, readStoredNotes } from './helpers';

const importFile = (notes: unknown) => ({
  name: 'backup.json',
  mimeType: 'application/json',
  buffer: Buffer.from(JSON.stringify({ format: 'mymemo', version: 1, exportedAt: new Date().toISOString(), notes })),
});

test('exports all notes as a JSON file', async ({ page }) => {
  await gotoApp(page);
  await addNote(page, { title: '내보낼 메모', body: '본문', tags: '백업' });

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '내보내기' }).click();
  await page.getByRole('menuitem', { name: /JSON 백업/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^mymemo-\d{4}-\d{2}-\d{2}\.json$/);

  const data = JSON.parse(await readFile(await download.path(), 'utf8'));
  expect(data.format).toBe('mymemo');
  expect(data.notes.map((n: { title: string }) => n.title)).toEqual(
    expect.arrayContaining(['내보낼 메모', ...SEED_TITLES]),
  );
  await expect(page.getByRole('status')).toContainText('내보냈습니다');
});

test('exports a readable Markdown document from the keyboard', async ({ page }) => {
  await gotoApp(page);
  const button = page.getByRole('button', { name: '내보내기' });
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menuitem', { name: /JSON 백업/ })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: /Markdown/ })).toBeFocused();

  const downloadPromise = page.waitForEvent('download');
  await page.keyboard.press('Enter');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^mymemo-\d{4}-\d{2}-\d{2}\.md$/);
  const md = await readFile(await download.path(), 'utf8');
  expect(md).toContain('## 프로젝트 아이디어');
  expect(md).toContain('#업무 #개발');
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(button).toBeFocused();
});

test('export menu closes with Escape and outside clicks', async ({ page }) => {
  await gotoApp(page);
  const button = page.getByRole('button', { name: '내보내기' });
  await button.click();
  await expect(page.getByRole('menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(button).toBeFocused();

  await button.click();
  await page.getByRole('heading', { name: /전체 메모/ }).click();
  await expect(page.getByRole('menu')).toHaveCount(0);
});

test('merges imported notes with existing ones', async ({ page }) => {
  await gotoApp(page);
  const seedCreatedAt = await page.evaluate(
    key => JSON.parse(localStorage.getItem(key) ?? '[]').find((n: { id: number }) => n.id === 1).createdAt,
    STORAGE_KEY,
  );
  await page.getByTestId('import-input').setInputFiles(
    importFile([
      // Same id + same createdAt = same note; the newer edit wins.
      {
        id: 1,
        title: '시안 작업 가이드 (새 버전)',
        body: 'x',
        tags: [],
        createdAt: seedCreatedAt,
        updatedAt: '2999-01-01T00:00:00.000Z',
      },
      { id: 500, title: '가져온 메모', body: '본문', tags: ['가져옴'], updatedAt: '2026-01-01T00:00:00.000Z' },
      { title: 'id 없음 — 건너뜀' },
    ]),
  );
  const dialog = page.getByRole('dialog', { name: '메모 가져오기' });
  await expect(dialog).toContainText('2개');
  await expect(dialog).toContainText('1개 항목은 건너뜁니다');
  await dialog.getByRole('button', { name: '병합' }).click();
  await expect(dialog).toBeHidden();

  await expect(page.getByRole('status')).toContainText('1개 추가, 1개 갱신');
  await expect(noteCard(page, '가져온 메모')).toBeVisible();
  await expect(noteCard(page, '시안 작업 가이드 (새 버전)')).toBeVisible();
  await expect(noteCard(page, '읽어야 할 책 리스트')).toBeVisible();

  await page.reload();
  const titles = (await readStoredNotes(page)).map(n => n.title).sort();
  expect(titles).toEqual(
    ['가져온 메모', '시안 작업 가이드 (새 버전)', '읽어야 할 책 리스트', '프로젝트 아이디어'].sort(),
  );
});

test('keeps both notes when an imported note shares an id with an unrelated local one', async ({ page }) => {
  await gotoApp(page);
  await page.getByTestId('import-input').setInputFiles(
    importFile([
      {
        id: 2,
        title: '다른 기기의 메모',
        createdAt: '2020-01-01T00:00:00.000Z',
        updatedAt: '2020-01-02T00:00:00.000Z',
      },
    ]),
  );
  await page.getByRole('dialog', { name: '메모 가져오기' }).getByRole('button', { name: '병합' }).click();
  await expect(page.getByRole('status')).toContainText('1개 추가, 0개 갱신');
  await expect(noteCard(page, '다른 기기의 메모')).toBeVisible();
  await expect(noteCard(page, SEED_TITLES[1])).toBeVisible();
  const ids = (await page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? '[]'), STORAGE_KEY)).map(
    (n: { id: number }) => n.id,
  );
  expect(new Set(ids).size).toBe(4);
});

test('replaces all notes after confirmation', async ({ page }) => {
  await gotoApp(page);
  await page.getByTestId('import-input').setInputFiles(importFile([{ id: 7, title: '유일한 메모' }]));
  page.once('dialog', d => d.accept());
  await page.getByRole('dialog', { name: '메모 가져오기' }).getByRole('button', { name: '모두 바꾸기' }).click();

  await expect(noteCard(page, '유일한 메모')).toBeVisible();
  for (const title of SEED_TITLES) await expect(noteCard(page, title)).toHaveCount(0);
  expect((await readStoredNotes(page)).map(n => n.title)).toEqual(['유일한 메모']);
});

test('keeps notes when replace is not confirmed', async ({ page }) => {
  await gotoApp(page);
  await page.getByTestId('import-input').setInputFiles(importFile([{ id: 7, title: '유일한 메모' }]));
  page.once('dialog', d => d.dismiss());
  const dialog = page.getByRole('dialog', { name: '메모 가져오기' });
  await dialog.getByRole('button', { name: '모두 바꾸기' }).click();
  await dialog.getByRole('button', { name: '취소' }).click();
  await expect(dialog).toBeHidden();
  for (const title of SEED_TITLES) await expect(noteCard(page, title)).toBeVisible();
  await expect(noteCard(page, '유일한 메모')).toHaveCount(0);
});

test('shows an error for an invalid file and changes nothing', async ({ page }) => {
  await gotoApp(page);
  await page.getByTestId('import-input').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{not json'),
  });
  await expect(page.getByRole('alert')).toContainText('올바른 JSON 파일이 아닙니다');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await readStoredNotes(page)).toHaveLength(SEED_TITLES.length);
});

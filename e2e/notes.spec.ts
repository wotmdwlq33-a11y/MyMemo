import { expect, test } from '@playwright/test';
import {
  SEED_TITLES,
  addNote,
  deleteButton,
  fillNoteForm,
  gotoApp,
  noteCard,
  noteDialog,
  readStoredNotes,
  saveNoteForm,
  searchInput,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await gotoApp(page);
});

test('shows the seed notes on first load', async ({ page }) => {
  for (const title of SEED_TITLES) {
    await expect(noteCard(page, title)).toBeVisible();
  }
});

test('adds a new note', async ({ page }) => {
  await addNote(page, { title: 'E2E 새 메모', body: '플레이라이트 본문', tags: '테스트, e2e' });

  await expect(noteCard(page, 'E2E 새 메모')).toBeVisible();
  await expect(page.getByText('플레이라이트 본문')).toBeVisible();
  await expect(page.getByText('#e2e')).toBeVisible();

  const stored = await readStoredNotes(page);
  expect(stored).toHaveLength(SEED_TITLES.length + 1);
  expect(stored.find(n => n.title === 'E2E 새 메모')).toMatchObject({
    body: '플레이라이트 본문',
    tags: ['테스트', 'e2e'],
  });
});

test('cancel discards a new note', async ({ page }) => {
  await page.getByRole('button', { name: '새 메모' }).click();
  await fillNoteForm(page, { title: '취소될 메모' });
  await noteDialog(page).getByRole('button', { name: '취소' }).click();

  await expect(noteDialog(page)).toBeHidden();
  await expect(noteCard(page, '취소될 메모')).toHaveCount(0);
});

test('edits an existing note', async ({ page }) => {
  const original = SEED_TITLES[0];
  await noteCard(page, original).click();

  const dialog = noteDialog(page);
  await expect(dialog.getByRole('heading', { name: '메모 수정' })).toBeVisible();
  await expect(dialog.getByLabel('제목')).toHaveValue(original);

  await fillNoteForm(page, { title: '수정된 가이드', body: '수정된 본문' });
  await saveNoteForm(page);

  await expect(noteCard(page, '수정된 가이드')).toBeVisible();
  await expect(noteCard(page, original)).toHaveCount(0);
  await expect(page.getByText('수정된 본문')).toBeVisible();

  const stored = await readStoredNotes(page);
  expect(stored).toHaveLength(SEED_TITLES.length);
});

test('deletes a note immediately without a blocking dialog', async ({ page }) => {
  const target = SEED_TITLES[1];
  page.on('dialog', () => {
    throw new Error('delete should not open a native dialog');
  });

  await deleteButton(page, target).click();

  await expect(noteCard(page, target)).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('삭제했습니다');
  const stored = await readStoredNotes(page);
  expect(stored.map(n => n.title)).not.toContain(target);
});

test('undo restores a deleted note in its place', async ({ page }) => {
  const before = await readStoredNotes(page);
  const target = SEED_TITLES[1];

  await deleteButton(page, target).click();
  await page.getByRole('button', { name: '실행 취소' }).click();

  await expect(noteCard(page, target)).toBeVisible();
  await expect(page.getByRole('button', { name: '실행 취소' })).toHaveCount(0);
  expect(await readStoredNotes(page)).toEqual(before);
});

test('persists changes across reload', async ({ page }) => {
  await addNote(page, { title: '새로고침 후에도', body: '남아 있어야 함' });
  await deleteButton(page, SEED_TITLES[2]).click();
  await expect(noteCard(page, SEED_TITLES[2])).toHaveCount(0);

  await page.reload();

  await expect(noteCard(page, '새로고침 후에도')).toBeVisible();
  await expect(noteCard(page, SEED_TITLES[0])).toBeVisible();
  await expect(noteCard(page, SEED_TITLES[2])).toHaveCount(0);
});

test('filters notes by search term', async ({ page }) => {
  const search = searchInput(page);

  // Matches title.
  await search.fill('책 리스트');
  await expect(noteCard(page, '읽어야 할 책 리스트')).toBeVisible();
  await expect(noteCard(page, '시안 작업 가이드')).toHaveCount(0);
  await expect(noteCard(page, '프로젝트 아이디어')).toHaveCount(0);

  // Matches tag.
  await search.fill('개발');
  await expect(noteCard(page, '프로젝트 아이디어')).toBeVisible();
  await expect(noteCard(page, '읽어야 할 책 리스트')).toBeVisible(); // '자기개발'
  await expect(noteCard(page, '시안 작업 가이드')).toHaveCount(0);

  // No match.
  await search.fill('존재하지 않는 검색어');
  await expect(page.getByText('검색 결과에 맞는 메모가 없습니다.')).toBeVisible();

  // Clearing restores everything.
  await search.fill('');
  for (const title of SEED_TITLES) {
    await expect(noteCard(page, title)).toBeVisible();
  }
});

test('double-clicking save creates only one note', async ({ page }) => {
  await page.getByRole('button', { name: '새 메모' }).click();
  await fillNoteForm(page, { title: '한 번만' });
  await noteDialog(page).getByRole('button', { name: '메모 저장' }).dblclick();
  await expect(noteDialog(page)).toBeHidden();
  const stored = await readStoredNotes(page);
  expect(stored.filter(n => n.title === '한 번만')).toHaveLength(1);
});

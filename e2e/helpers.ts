import { expect, type Locator, type Page } from '@playwright/test';

export const STORAGE_KEY = 'mymemo.notes';

export const SEED_TITLES = ['시안 작업 가이드', '읽어야 할 책 리스트', '프로젝트 아이디어'] as const;

export interface NoteInput {
  title: string;
  body?: string;
  tags?: string;
}

/** Open the app and wait until the seed (or stored) notes are rendered. */
export async function gotoApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('button', { name: '새 메모' })).toBeVisible();
}

export function noteDialog(page: Page): Locator {
  return page.getByRole('dialog');
}

/** The stretched title button that opens a card's edit modal. */
export function noteCard(page: Page, title: string): Locator {
  return page.getByRole('button', { name: title, exact: true });
}

export function deleteButton(page: Page, title: string): Locator {
  return page.getByRole('button', { name: `'${title}' 메모 삭제` });
}

export function searchInput(page: Page): Locator {
  return page.getByRole('searchbox', { name: '메모 검색' });
}

/** Fill the open note dialog. Only provided fields are touched. */
export async function fillNoteForm(page: Page, note: Partial<NoteInput>): Promise<void> {
  const dialog = noteDialog(page);
  if (note.title !== undefined) await dialog.getByLabel('제목').fill(note.title);
  if (note.body !== undefined) await dialog.getByLabel('본문').fill(note.body);
  if (note.tags !== undefined) await dialog.getByLabel('태그 (쉼표로 구분)').fill(note.tags);
}

export async function saveNoteForm(page: Page): Promise<void> {
  await noteDialog(page).getByRole('button', { name: '메모 저장' }).click();
  await expect(noteDialog(page)).toBeHidden();
}

export async function addNote(page: Page, note: NoteInput): Promise<void> {
  await page.getByRole('button', { name: '새 메모' }).click();
  await expect(noteDialog(page)).toBeVisible();
  await fillNoteForm(page, note);
  await saveNoteForm(page);
}

/** Read the persisted notes straight from localStorage. */
export async function readStoredNotes(page: Page): Promise<Array<{ title: string; body: string; tags: string[] }>> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '[]'), STORAGE_KEY);
}

/**
 * Wait until enter animations have finished (cards and dialogs fade/scale in),
 * so checks like axe's color-contrast see the final colors.
 */
export async function waitForAnimations(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('[data-testid="note-card"], [role="dialog"]')].every(
          el =>
            getComputedStyle(el).opacity === '1' &&
            ['none', 'matrix(1, 0, 0, 1, 0, 0)'].includes(getComputedStyle(el).transform),
        ),
      ),
    )
    .toBe(true);
}

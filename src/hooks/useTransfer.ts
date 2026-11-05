import { type ChangeEvent, useCallback, useState } from 'react';
import type { Note } from '../lib/notes';
import { downloadText } from '../lib/download';
import { type ImportMode, MAX_IMPORT_BYTES, applyImport, exportFileName, exportNotes, parseImport } from '../lib/transfer';
import type { SetToast } from './useToast';

export type PendingImport = { fileName: string; notes: Note[]; skipped: number };

/** JSON export, and import via a file picker followed by a confirm dialog. */
export function useTransfer(notes: Note[], setNotes: (notes: Note[]) => void, setToast: SetToast) {
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);

  const handleExport = () => {
    downloadText(exportNotes(notes), exportFileName(), 'application/json');
    setToast({ kind: 'info', text: `메모 ${notes.length}개를 내보냈습니다.` });
  };

  const handleFileChosen = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    input.value = ''; // allow choosing the same file again
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setToast({ kind: 'error', text: '가져오기 실패: 파일이 너무 큽니다 (최대 10MB).' });
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      setToast({ kind: 'error', text: '파일을 읽지 못했습니다.' });
      return;
    }
    const result = parseImport(text);
    if ('error' in result) {
      setToast({ kind: 'error', text: `가져오기 실패: ${result.error}` });
      return;
    }
    setPendingImport({ fileName: file.name, notes: result.notes, skipped: result.skipped });
  };

  const confirmImport = (mode: ImportMode) => {
    if (!pendingImport) return;
    if (mode === 'replace' && notes.length > 0 &&
      !window.confirm(`현재 메모 ${notes.length}개가 모두 지워지고 가져온 메모로 바뀝니다. 계속할까요?`)) {
      return;
    }
    const result = applyImport(notes, pendingImport.notes, mode);
    setNotes(result.notes);
    setPendingImport(null);
    setToast({
      kind: 'info',
      text: mode === 'replace'
        ? `메모 ${result.added}개로 바꿨습니다.`
        : `가져오기 완료: ${result.added}개 추가, ${result.updated}개 갱신, ${result.unchanged}개 유지`,
    });
  };

  const cancelImport = useCallback(() => setPendingImport(null), []);

  return { pendingImport, handleExport, handleFileChosen, confirmImport, cancelImport };
}

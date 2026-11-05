import { useState } from 'react';
import { clearCorruptBackup, getBrowserStorage, readCorruptBackup } from '../lib/notes';
import { downloadText } from '../lib/download';

/**
 * Shown when loadNotes backed up stored data it could not parse: lets the user
 * download the raw backup or discard it.
 */
export default function CorruptDataBanner() {
  const [corruptBackup, setCorruptBackup] = useState(() => readCorruptBackup(getBrowserStorage()));
  if (corruptBackup === null) return null;

  const download = () => downloadText(corruptBackup, 'mymemo-corrupt-backup.txt', 'text/plain');
  const discard = () => {
    if (!window.confirm('손상된 데이터 백업을 삭제할까요? 삭제하면 되돌릴 수 없습니다.')) return;
    clearCorruptBackup(getBrowserStorage());
    setCorruptBackup(null);
  };

  return (
    <div role="alert" className="mb-6 p-4 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 text-sm">
      <p className="font-semibold mb-1">저장된 메모 데이터를 읽지 못했습니다.</p>
      <p className="mb-3">
        손상된 원본은 따로 백업해 두었습니다. 파일로 받아 두면 직접 복구를 시도할 수 있어요.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={download} className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium">
          백업 파일 받기
        </button>
        <button type="button" onClick={discard} className="px-3 py-1.5 rounded-lg bg-white/70 hover:bg-white dark:bg-slate-900/60 dark:hover:bg-slate-900 font-medium">
          백업 삭제
        </button>
      </div>
    </div>
  );
}

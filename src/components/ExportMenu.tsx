import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { Download, FileJson, FileText } from 'lucide-react';
import type { ExportFormat } from '../hooks/useTransfer';

type Props = {
  onExport: (format: ExportFormat) => void;
  buttonClassName: string;
};

const ITEMS: { format: ExportFormat; label: string; hint: string; Icon: typeof FileJson }[] = [
  { format: 'json', label: 'JSON 백업', hint: '다시 가져올 수 있는 전체 백업', Icon: FileJson },
  { format: 'markdown', label: 'Markdown', hint: '읽기용 .md 문서', Icon: FileText },
];

/** Menu button offering the export formats (WAI-ARIA menu button pattern). */
export default function ExportMenu({ onExport, buttonClassName }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    itemRefs.current[0]?.focus();
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };

  const onMenuKeyDown = (e: KeyboardEvent) => {
    const items = itemRefs.current.filter((el): el is HTMLButtonElement => el !== null);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close(true);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      items[(index + step + items.length) % items.length]?.focus();
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      items[e.key === 'Home' ? 0 : items.length - 1]?.focus();
    } else if (e.key === 'Tab') {
      close(false);
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-label="내보내기"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        title="내보내기"
        className={buttonClassName}
      >
        <Download size={18} />
      </button>
      {open && (
        <div
          ref={menuRef}
          id={`${id}-menu`}
          role="menu"
          aria-label="내보내기 형식"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 mt-2 w-56 z-30 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl"
        >
          {ITEMS.map(({ format, label, hint, Icon }, i) => (
            <button
              key={format}
              ref={el => {
                itemRefs.current[i] = el;
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                close(true);
                onExport(format);
              }}
              className="w-full flex items-start gap-3 px-3 py-2 rounded-lg text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800 outline-none"
            >
              <Icon size={16} className="mt-0.5 flex-shrink-0 text-indigo-600 dark:text-indigo-400" />
              <span>
                <span className="block font-medium">{label}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

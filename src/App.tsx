/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef, useCallback, useDeferredValue } from 'react';
import { AnimatePresence, MotionConfig } from 'motion/react';
import { getBrowserStorage } from './lib/notes';
import { type SortKey, type View, countTags, queryNotes } from './lib/search';
import { loadSortPref, saveSortPref } from './lib/sortPref';
import { useNotes } from './hooks/useNotes';
import { useNoteEditor } from './hooks/useNoteEditor';
import { useTheme } from './hooks/useTheme';
import { useToast } from './hooks/useToast';
import { useTransfer } from './hooks/useTransfer';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import CorruptDataBanner from './components/CorruptDataBanner';
import ListToolbar from './components/ListToolbar';
import NoteList from './components/NoteList';
import NoteEditorDialog from './components/NoteEditorDialog';
import ToastRegion from './components/Toast';
import ImportDialog from './components/ImportDialog';
import TagManagerDialog from './components/TagManagerDialog';

export default function App() {
  const [toast, setToast] = useToast();
  const { notes, setNotes, saveNote, deleteNote, togglePin, toggleArchive, renameTag, deleteTag } = useNotes(setToast);
  const { themePref, cycleTheme } = useTheme();
  const { pendingImport, handleExport, handleFileChosen, confirmImport, cancelImport } = useTransfer(
    notes,
    setNotes,
    setToast,
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [view, setView] = useState<View>('active');
  const [sort, setSort] = useState<SortKey>(() => loadSortPref(getBrowserStorage()));
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  // Element that opened a dialog, so focus can return there when it closes.
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const editor = useNoteEditor(returnFocusRef, saveNote);

  useEffect(() => {
    saveSortPref(getBrowserStorage(), sort);
  }, [sort]);

  const focusSearch = useCallback(() => searchRef.current?.focus(), []);
  useGlobalShortcuts(editor.isOpen || pendingImport !== null || isTagManagerOpen, focusSearch, editor.openNew);

  // Every tag in use (most frequent first), for suggestions in the editor.
  const allTagCounts = useMemo(() => countTags(notes), [notes]);
  const knownTags = useMemo(() => allTagCounts.map(([tag]) => tag), [allTagCounts]);
  const closeTagManager = useCallback(() => setIsTagManagerOpen(false), []);
  const editingNote = editor.editingId === null ? undefined : notes.find(n => n.id === editor.editingId);

  const activeCount = useMemo(() => notes.filter(n => !n.archived).length, [notes]);
  const archivedCount = notes.length - activeCount;

  const viewTags = useMemo(() => countTags(notes.filter(n => n.archived === (view === 'archived'))), [notes, view]);

  // Ignore selected tags that no longer exist in the current view (e.g. after
  // deleting the last note with that tag), so the list never filters to empty.
  const activeTags = useMemo(
    () => selectedTags.filter(t => viewTags.some(([tag]) => tag === t)),
    [selectedTags, viewTags],
  );

  // Typing stays responsive with many notes: filtering uses a deferred copy.
  const deferredSearch = useDeferredValue(searchTerm);
  const filteredNotes = useMemo(
    () => queryNotes(notes, { search: deferredSearch, tags: activeTags, view, sort }),
    [notes, deferredSearch, activeTags, view, sort],
  );
  const queryKey = JSON.stringify([deferredSearch, activeTags, view, sort]);

  const toggleTag = (tag: string) =>
    setSelectedTags(activeTags.includes(tag) ? activeTags.filter(t => t !== tag) : [...activeTags, tag]);

  const switchView = (next: View) => {
    setView(next);
    setSelectedTags([]);
  };

  const isFiltering = searchTerm.trim() !== '' || activeTags.length > 0;

  return (
    // Honour the OS "reduce motion" setting for transform/layout animations.
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans selection:bg-indigo-100 selection:text-indigo-900">
        <Header
          searchRef={searchRef}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onExport={handleExport}
          onFileChosen={handleFileChosen}
          themePref={themePref}
          onCycleTheme={cycleTheme}
          onNewNote={editor.openNew}
          returnFocusRef={returnFocusRef}
        />

        <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
          <Sidebar
            view={view}
            activeCount={activeCount}
            archivedCount={archivedCount}
            tags={viewTags}
            activeTags={activeTags}
            hasAnyTags={knownTags.length > 0}
            onSwitchView={switchView}
            onToggleTag={toggleTag}
            onOpenTagManager={e => {
              returnFocusRef.current = e.currentTarget;
              setIsTagManagerOpen(true);
            }}
          />

          <main className="flex-1 min-w-0">
            <CorruptDataBanner />
            <ListToolbar
              view={view}
              resultCount={filteredNotes.length}
              activeTags={activeTags}
              onToggleTag={toggleTag}
              onClearTags={() => setSelectedTags([])}
              sort={sort}
              onSortChange={setSort}
            />
            <NoteList
              notes={filteredNotes}
              queryKey={queryKey}
              query={deferredSearch}
              selectedTags={activeTags}
              view={view}
              isFiltering={isFiltering}
              onOpen={editor.openEdit}
              onDelete={deleteNote}
              onTogglePin={togglePin}
              onToggleArchive={toggleArchive}
              onTagClick={toggleTag}
            />
          </main>
        </div>

        <ToastRegion toast={toast} onDismiss={() => setToast(null)} />

        <AnimatePresence>
          {isTagManagerOpen && (
            <TagManagerDialog
              tags={allTagCounts}
              onRename={(from, to) => {
                renameTag(from, to);
                setSelectedTags(prev => [...new Set(prev.map(t => (t === from ? to.trim() : t)))]);
              }}
              onDelete={deleteTag}
              onClose={closeTagManager}
              returnFocusTo={returnFocusRef}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {pendingImport && (
            <ImportDialog
              fileName={pendingImport.fileName}
              notes={pendingImport.notes}
              skipped={pendingImport.skipped}
              existingCount={notes.length}
              onConfirm={confirmImport}
              onCancel={cancelImport}
              returnFocusTo={returnFocusRef}
            />
          )}
        </AnimatePresence>

        <NoteEditorDialog
          editor={editor}
          editingNote={editingNote}
          knownTags={knownTags}
          returnFocusRef={returnFocusRef}
        />
      </div>
    </MotionConfig>
  );
}

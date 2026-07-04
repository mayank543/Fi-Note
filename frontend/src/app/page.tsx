"use client";

import { useState } from "react";
import { Search, Menu, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNotesQuery, useDeleteNote } from "@/hooks/use-notes";
import { useLabelsQuery } from "@/hooks/use-labels";
import { useTheme } from "@/providers/theme-provider";
import type { Filter, Note, EditorSourceRect, Label } from "@/lib/constants";
import { LoadingScreen } from "@/components/loading-screen";
import { HeroScreen } from "@/components/hero-screen";
import { VaultLayout } from "@/components/vault-layout";
import { Sidebar } from "@/components/sidebar";
import { NoteGrid } from "@/components/note-grid";
import { EditorModal } from "@/components/editor-modal";
import { LabelManager } from "@/components/label-manager";
import { ShareModal } from "@/components/share-modal";
import { Toast, type ToastData } from "@/components/toast";

export default function Dashboard() {
  const { authMode, logout, enableGuestLogin } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  const [activeFilter, setActiveFilter] = useState<Filter>({ type: "all" });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { data: notesData, isLoading } = useNotesQuery(
    authMode,
    activeFilter,
    currentPage,
    activeSearch,
  );
  const { data: labels = [] } = useLabelsQuery(authMode);

  const notes = notesData?.data ?? [];
  const totalPages = notesData?.meta?.totalPages ?? 1;

  const [editorState, setEditorState] = useState<{
    isOpen: boolean;
    note?: Note;
  }>({ isOpen: false });
  const [editorKey, setEditorKey] = useState(0);
  const [editorSourceRect, setEditorSourceRect] =
    useState<EditorSourceRect | null>(null);
  const [hiddenSourceNoteId, setHiddenSourceNoteId] = useState<string | null>(
    null,
  );

  const [labelMgrState, setLabelMgrState] = useState<{
    isOpen: boolean;
    mode: "create" | "edit";
    editingLabel: Label | null;
  }>({ isOpen: false, mode: "create", editingLabel: null });
  const [labelMgrKey, setLabelMgrKey] = useState(0);

  const [isShareOpen, setIsShareOpen] = useState(false);

  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "info",
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const deleteNote = useDeleteNote(authMode);

  const handleFilterChange = (filter: Filter) => {
    setActiveFilter(filter);
    setCurrentPage(1);
    setIsMobileMenuOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchInput);
    setCurrentPage(1);
  };

  const handleSearchClear = () => {
    setSearchInput("");
    setActiveSearch("");
    setCurrentPage(1);
  };

  const openEditor = (note?: Note, sourceEl?: HTMLElement | null) => {
    const cardEl = sourceEl?.closest('[data-note-card="true"]') as HTMLElement | null || sourceEl;
    const rect = cardEl?.getBoundingClientRect();
    setEditorSourceRect(
      rect
        ? {
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left,
          }
        : null,
    );
    setHiddenSourceNoteId(note?.id ?? null);
    setEditorKey((k) => k + 1);
    setEditorState({ isOpen: true, note });
  };

  const closeEditor = () => {
    setEditorState({ isOpen: false });
    setEditorSourceRect(null);
    setHiddenSourceNoteId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isTrash = activeFilter.type === "trash";
    deleteNote.mutate(
      { id, permanent: isTrash },
      {
        onSuccess: () => {
          showToast(
            isTrash
              ? "Vault Cleared: Data Purged"
              : "Record Archived: Moved to Cold Storage",
            "success",
          );
        },
        onError: () => {
          showToast("Security Conflict: Deletion Rejected", "error");
        },
      },
    );
  };

  const handleShare = () => {
    showToast("Email Service: Work in Progress 🚧", "info");
  };

  if (isLoading && notes.length === 0 && authMode !== "none")
    return <LoadingScreen />;

  if (authMode === "none")
    return <HeroScreen onGuestLogin={enableGuestLogin} />;

  const header = (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
      <div className="flex items-center justify-between w-full md:w-auto">
        <div className="min-w-0">
          <h1 className="text-lg md:text-xl font-black tracking-tight truncate capitalize text-slate-900 dark:text-zinc-50">
            {activeFilter.type === "all"
              ? "Master Ledger"
              : activeFilter.type === "trash"
                ? "Archive"
                : labels.find((l) => l.id === activeFilter.id)?.name ||
                  "Filtered"}
          </h1>
          <p className="text-slate-400 dark:text-zinc-500 text-[9px] font-black uppercase tracking-widest">
            {notes.length} Total Nodes
          </p>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden p-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-sm text-slate-600 dark:text-zinc-300"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSearchSubmit} className="w-full md:max-w-xs relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-slate-900 dark:group-focus-within:text-zinc-100" />
        <input
          type="text"
          placeholder="Query Database..."
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            if (!e.target.value) handleSearchClear();
          }}
          className="w-full pl-9 pr-3 py-2.5 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 text-xs font-medium focus:border-slate-900 dark:focus:border-zinc-600 shadow-sm"
        />
      </form>
    </div>
  );

  return (
    <>
      <VaultLayout
        isDarkMode={isDarkMode}
        sidebar={
          <Sidebar
            labels={labels}
            activeFilter={activeFilter}
            isDarkMode={isDarkMode}
            isMobileMenuOpen={isMobileMenuOpen}
            onFilterChange={handleFilterChange}
            onToggleMobile={() => setIsMobileMenuOpen(false)}
            onToggleTheme={toggleTheme}
            onLogout={logout}
            onEditLabel={(l) => {
              setLabelMgrState({
                isOpen: true,
                mode: "edit",
                editingLabel: l,
              });
              setLabelMgrKey((k) => k + 1);
            }}
            onCreateLabel={() => {
              setLabelMgrState({
                isOpen: true,
                mode: "create",
                editingLabel: null,
              });
              setLabelMgrKey((k) => k + 1);
            }}
          />
        }
        header={header}
      >
        <NoteGrid
          notes={notes}
          totalPages={totalPages}
          currentPage={currentPage}
          activeFilter={activeFilter}
          isDarkMode={isDarkMode}
          hiddenSourceNoteId={hiddenSourceNoteId}
          onPageChange={setCurrentPage}
          onOpenEditor={openEditor}
          onDelete={handleDelete}
          onShare={() => setIsShareOpen(true)}
        />
      </VaultLayout>

      <button
        onClick={() => openEditor()}
        className="lg:hidden fixed bottom-6 right-6 h-14 w-14 bg-slate-900 dark:bg-zinc-50 text-white dark:text-zinc-950 rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-90 transition-transform"
      >
        <Plus className="h-6 w-6" />
      </button>

      <EditorModal
        key={"editor-" + editorKey}
        isOpen={editorState.isOpen}
        note={editorState.note ?? null}
        sourceRect={editorSourceRect}
        labels={labels}
        isDarkMode={isDarkMode}
        authMode={authMode}
        onClose={closeEditor}
        onShowToast={showToast}
      />

      <LabelManager
        key={"label-" + labelMgrKey}
        isOpen={labelMgrState.isOpen}
        mode={labelMgrState.mode}
        editingLabel={labelMgrState.editingLabel}
        authMode={authMode}
        onClose={() =>
          setLabelMgrState({ isOpen: false, mode: "create", editingLabel: null })
        }
        onShowToast={showToast}
      />

      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        onShare={handleShare}
      />

      <Toast toast={toast} />
    </>
  );
}

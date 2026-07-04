"use client";

import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { NoteCard } from "./note-card";
import type { Note, Filter } from "@/lib/constants";

interface NoteGridProps {
  notes: Note[];
  totalPages: number;
  currentPage: number;
  activeFilter: Filter;
  isDarkMode: boolean;
  hiddenSourceNoteId: string | null;
  onPageChange: (page: number) => void;
  onOpenEditor: (note?: Note, el?: HTMLElement | null) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onShare: (id: string) => void;
}

export function NoteGrid({
  notes,
  totalPages,
  currentPage,
  activeFilter,
  isDarkMode,
  hiddenSourceNoteId,
  onPageChange,
  onOpenEditor,
  onDelete,
  onShare,
}: NoteGridProps) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 content-start max-w-[1800px]">
        {activeFilter.type !== "trash" && (
          <button
            onClick={(e) => onOpenEditor(undefined, e.currentTarget)}
            className="border border-dashed border-slate-300 dark:border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-center text-slate-400 dark:text-zinc-600 hover:text-slate-900 dark:hover:text-zinc-200 hover:border-slate-900 dark:hover:border-zinc-600 cursor-pointer h-40 transition-all shadow-sm"
          >
            <Plus className="h-5 w-5 mb-2" />
            <span className="font-black uppercase tracking-widest text-[8px]">
              New Record
            </span>
          </button>
        )}
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            isDarkMode={isDarkMode}
            isHidden={hiddenSourceNoteId === note.id}
            isTrashView={activeFilter.type === "trash"}
            onOpen={onOpenEditor}
            onDelete={onDelete}
            onShare={onShare}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-10 mb-8 space-x-2 bg-white dark:bg-zinc-900 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-800 max-w-fit mx-auto">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-20 text-slate-600 dark:text-zinc-400 transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="px-3 font-black text-[10px] text-slate-900 dark:text-zinc-100">
            {currentPage} / {totalPages}
          </div>
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-20 text-slate-600 dark:text-zinc-400 transition-all"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}

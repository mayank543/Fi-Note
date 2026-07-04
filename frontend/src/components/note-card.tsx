"use client";

import { Users, Share2, Edit2, Trash2 } from "lucide-react";
import { type Note, resolveHex } from "@/lib/constants";

interface NoteCardProps {
  note: Note;
  isDarkMode: boolean;
  isHidden: boolean;
  isTrashView: boolean;
  onOpen: (note: Note, el: HTMLElement | null) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onShare: (id: string) => void;
}

export function NoteCard({
  note,
  isDarkMode,
  isHidden,
  isTrashView,
  onOpen,
  onDelete,
  onShare,
}: NoteCardProps) {
  const hex = resolveHex(note.color, isDarkMode);

  return (
    <div
      data-note-card="true"
      onClick={(e) => !isTrashView && onOpen(note, e.currentTarget)}
      style={{ backgroundColor: hex }}
      className={`group border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-[box-shadow,transform] flex flex-col h-40 relative overflow-hidden ${isTrashView ? "" : "cursor-pointer active:scale-95 md:hover:-translate-y-0.5"} ${isHidden ? "opacity-0" : ""}`}
    >
      <div className="absolute top-0 right-0 w-12 h-12 bg-black/[0.03] dark:bg-white/[0.03] rounded-full -mr-6 -mt-6" />
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-start mb-2 relative z-10 text-slate-900 dark:text-zinc-50">
          <h3 className="font-bold text-sm leading-tight truncate pr-2">{note.title}</h3>
          <div className="text-[9px] text-slate-400 dark:text-zinc-500 font-black uppercase shrink-0">
            {new Date(note.created_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>
        <p className="text-slate-600 dark:text-zinc-300 text-xs leading-relaxed line-clamp-3 flex-grow mb-3 font-medium relative z-10">
          {note.content}
        </p>

        <div className="flex flex-col gap-2 mt-auto relative z-10">
          {note.shared_with && note.shared_with.length > 0 && (
            <div className="flex items-center -space-x-2 overflow-hidden mb-1">
              <div
                className="bg-slate-200 dark:bg-zinc-800 p-1 rounded-full z-10 border border-white dark:border-zinc-900"
                title={`${note.shared_with.length} Collaborator(s)`}
              >
                <Users className="w-2.5 h-2.5 text-slate-500 dark:text-zinc-400" />
              </div>
              {note.shared_with.slice(0, 3).map((collab, idx) => (
                <div
                  key={idx}
                  className="h-4.5 w-4.5 rounded-full bg-slate-900 dark:bg-zinc-100 flex items-center justify-center text-[7px] font-black text-white dark:text-zinc-950 border border-white dark:border-zinc-900 uppercase"
                  title={collab.user.email}
                >
                  {collab.user.email[0]}
                </div>
              ))}
              {note.shared_with.length > 3 && (
                <div className="text-[7px] font-bold text-slate-400 ml-3">
                  +{note.shared_with.length - 3}
                </div>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            {note.labels?.slice(0, 2).map((label) => (
              <span
                key={label.id}
                className="bg-black/5 dark:bg-white/10 text-slate-800 dark:text-zinc-200 text-[8px] font-black px-1.5 py-0.5 rounded uppercase border border-black/5 dark:border-white/5"
              >
                {label.name}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute bottom-2 right-2 flex space-x-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity z-20">
        {!isTrashView && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShare(note.id);
              }}
              className="p-2 md:p-1 bg-white/90 dark:bg-zinc-800/90 backdrop-blur rounded shadow-md text-slate-600 dark:text-zinc-400"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpen(note, e.currentTarget.closest("[data-note-card='true']") as HTMLElement | null);
              }}
              className="p-2 md:p-1 bg-white/90 dark:bg-zinc-800/90 backdrop-blur rounded shadow-md text-slate-600 dark:text-zinc-400"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        <button
          onClick={(e) => onDelete(note.id, e)}
          className="p-2 md:p-1 bg-white/90 dark:bg-zinc-800/90 backdrop-blur rounded shadow-md text-red-500 dark:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

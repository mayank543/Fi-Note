"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  type Note,
  type Label,
  type EditorSourceRect,
  type AuthMode,
  COLOR_PALETTE,
  resolveHex,
  EDITOR_EXPAND_MS,
} from "@/lib/constants";
import { useCreateNote, useUpdateNote, useToggleLabel } from "@/hooks/use-notes";

interface EditorModalProps {
  isOpen: boolean;
  note: Note | null;
  sourceRect: EditorSourceRect | null;
  labels: Label[];
  isDarkMode: boolean;
  authMode: AuthMode;
  onClose: () => void;
  onShowToast: (message: string, type: "success" | "error" | "info") => void;
}

export function EditorModal({
  isOpen,
  note,
  sourceRect,
  labels,
  isDarkMode,
  authMode,
  onClose,
  onShowToast,
}: EditorModalProps) {
  const [currentNote, setCurrentNote] = useState<Partial<Note>>(() => {
    if (note) {
      const foundColor = COLOR_PALETTE.find(
        (c) =>
          c.light === note.color ||
          c.dark === note.color ||
          c.id === note.color,
      );
      return { ...note, color: foundColor ? foundColor.id : "default" };
    }
    return { title: "", content: "", color: "default", labels: [] };
  });
  const [editorTransform, setEditorTransform] = useState(
    "translate3d(0, 0, 0) scale(1)",
  );
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);
  const editorCardRef = useRef<HTMLDivElement | null>(null);

  const createNote = useCreateNote(authMode);
  const updateNote = useUpdateNote(authMode);
  const toggleLabel = useToggleLabel(authMode);

  useLayoutEffect(() => {
    if (!isOpen) return;

    if (window.innerWidth < 768) {
      const raf = requestAnimationFrame(() => {
        setIsAnimatingIn(true);
      });
      return () => cancelAnimationFrame(raf);
    }

    if (!sourceRect || !editorCardRef.current) {
      const raf = requestAnimationFrame(() => {
        setIsAnimatingIn(true);
      });
      return () => cancelAnimationFrame(raf);
    }

    const finalRect = editorCardRef.current.getBoundingClientRect();
    const scaleX = sourceRect.width / finalRect.width;
    const scaleY = sourceRect.height / finalRect.height;
    const translateX = sourceRect.left - finalRect.left;
    const translateY = sourceRect.top - finalRect.top;

    setEditorTransform(
      `translate3d(${translateX}px, ${translateY}px, 0) scale(${scaleX}, ${scaleY})`,
    );

    let raf2: number;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setIsAnimatingIn(true);
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [isOpen, sourceRect]);

  const handleSave = () => {
    if (!currentNote.title || !currentNote.content) return;

    const payload = {
      title: currentNote.title,
      content: currentNote.content,
      color: currentNote.color || "default",
    };

    if (currentNote.id) {
      updateNote.mutate(
        { id: currentNote.id, ...payload },
        {
          onSuccess: () => {
            onClose();
            onShowToast("Protocol Synchronized: Record Updated", "success");
          },
          onError: () => {
            onShowToast("Protocol Failure: Save Error Detected", "error");
          },
        },
      );
    } else {
      createNote.mutate(payload, {
        onSuccess: () => {
          onClose();
          onShowToast("Protocol Initialized: New Entry Secured", "success");
        },
        onError: () => {
          onShowToast("Protocol Failure: Save Error Detected", "error");
        },
      });
    }
  };

  const handleToggleLabel = (labelId: string, isAttached: boolean) => {
    if (!currentNote.id) return;

    setCurrentNote((prev) => ({
      ...prev,
      labels: isAttached
        ? prev.labels?.filter((l) => l.id !== labelId) || []
        : [
            ...(prev.labels || []),
            ...labels.filter((l) => l.id === labelId),
          ],
    }));

    toggleLabel.mutate({ noteId: currentNote.id, labelId, isAttached });
  };

  if (!isOpen) return null;

  const activeNoteColor = resolveHex(currentNote.color, isDarkMode);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 transition-all duration-500 ${
        isAnimatingIn
          ? "bg-zinc-950/60 backdrop-blur-md"
          : "bg-zinc-950/0 backdrop-blur-none"
      }`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={editorCardRef}
        style={{
          transformOrigin: "top left",
          transform: isAnimatingIn
            ? "translate3d(0, 0, 0) scale(1)"
            : window.innerWidth < 768
              ? "translate3d(0, 100%, 0)"
              : editorTransform,
          opacity: isAnimatingIn
            ? 1
            : window.innerWidth < 768
              ? 1
              : 0,
          borderRadius:
            isAnimatingIn
              ? window.innerWidth < 768
                ? "0px"
                : "32px"
              : "16px",
          backgroundColor: activeNoteColor,
          transition: `transform ${EDITOR_EXPAND_MS}ms cubic-bezier(0.16, 1, 0.3, 1), opacity ${EDITOR_EXPAND_MS * 0.6}ms ease-out, border-radius ${EDITOR_EXPAND_MS}ms cubic-bezier(0.16, 1, 0.3, 1), background-color 200ms ease`,
        }}
        className="w-full h-full md:h-auto md:max-w-2xl overflow-hidden flex flex-col max-h-screen md:max-h-[85vh] will-change-[transform,opacity,border-radius] border-none md:border md:border-white/20 dark:md:border-zinc-800 shadow-2xl"
      >
        <div
          className={`flex flex-col h-full min-h-0 text-slate-900 dark:text-zinc-50 transition-opacity duration-300 ${
            isAnimatingIn ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="p-4 md:p-6 border-b border-black/5 dark:border-white/5 flex items-center">
            <button
              onClick={onClose}
              className="md:hidden mr-3 p-1 text-slate-400 hover:text-slate-900 dark:hover:text-zinc-100"
            >
              <X className="h-5 w-5" />
            </button>
            <input
              type="text"
              placeholder="Subject..."
              value={currentNote.title}
              onChange={(e) =>
                setCurrentNote({ ...currentNote, title: e.target.value })
              }
              className="text-lg md:text-xl font-black bg-transparent outline-none w-full tracking-tight"
            />
          </div>
          {currentNote.id && (
            <div className="px-4 md:px-6 py-2 border-b border-black/5 dark:border-white/5 bg-transparent flex flex-wrap gap-2 items-center overflow-x-auto whitespace-nowrap scrollbar-none">
              <span className="text-[9px] font-black opacity-50 uppercase tracking-widest mr-2 text-slate-500 dark:text-zinc-400">
                Indexing:
              </span>
              {labels.map((lbl) => {
                const hasLabel = currentNote.labels?.some(
                  (l) => l.id === lbl.id,
                );
                return (
                  <button
                    key={lbl.id}
                    onClick={() => handleToggleLabel(lbl.id, !!hasLabel)}
                    className={`text-[9px] font-black px-2.5 py-1 rounded-full transition-all uppercase ${
                      hasLabel
                        ? "bg-slate-900 dark:bg-zinc-50 text-white dark:text-zinc-950"
                        : "bg-black/5 dark:bg-white/10"
                    }`}
                  >
                    {lbl.name}
                  </button>
                );
              })}
            </div>
          )}
          <textarea
            placeholder="Secure data entry..."
            value={currentNote.content}
            onChange={(e) =>
              setCurrentNote({ ...currentNote, content: e.target.value })
            }
            className="p-4 md:p-6 w-full flex-grow resize-none outline-none bg-transparent h-[300px] text-base font-medium leading-relaxed"
          />
          <div className="p-4 md:p-6 border-t border-black/5 dark:border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex flex-wrap justify-center gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c.id}
                  onClick={() =>
                    setCurrentNote({ ...currentNote, color: c.id })
                  }
                  className={`w-8 h-8 md:w-6 md:h-6 rounded-full border border-black/20 dark:border-white/20 transition-all ${
                    currentNote.color === c.id
                      ? "ring-2 ring-slate-900 dark:ring-zinc-50 ring-offset-1 scale-110"
                      : ""
                  }`}
                  style={{
                    backgroundColor: isDarkMode ? c.dark : c.light,
                  }}
                />
              ))}
            </div>
            <div className="flex w-full sm:w-auto space-x-3">
              <button
                onClick={onClose}
                className="hidden md:block px-6 py-2.5 font-black text-[10px] uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors"
              >
                Discard
              </button>
              <button
                onClick={handleSave}
                className="flex-1 sm:flex-none px-8 py-4 md:py-2.5 bg-slate-900 dark:bg-zinc-50 text-white dark:text-zinc-950 rounded-2xl md:rounded-xl font-black text-xs md:text-[10px] uppercase tracking-wider shadow-lg active:scale-95 transition-all"
              >
                Commit Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

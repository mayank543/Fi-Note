"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  Plus,
  LogOut,
  Edit2,
  Trash2,
  Share2,
  Search,
  ChevronLeft,
  ChevronRight,
  Tag,
  FolderOpen,
} from "lucide-react";

interface Label {
  id: string;
  name: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  owner_id: string;
  labels: Label[];
}

interface EditorSourceRect {
  width: number;
  height: number;
  top: number;
  left: number;
}

const EDITOR_EXPAND_MS = 520;

export default function Dashboard() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [activeFilter, setActiveFilter] = useState<{
    type: "all" | "trash" | "label";
    id?: string;
  }>({ type: "all" });

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isLabelMgrOpen, setIsLabelMgrOpen] = useState(false);
  const [editorSourceRect, setEditorSourceRect] =
    useState<EditorSourceRect | null>(null);
  const [editorTransform, setEditorTransform] = useState(
    "translate3d(0, 0, 0) scale(1)",
  );
  const [isEditorAnimatingIn, setIsEditorAnimatingIn] = useState(false);
  const [editorPhase, setEditorPhase] = useState<"idle" | "expanding" | "open">(
    "idle",
  );
  const [hiddenSourceNoteId, setHiddenSourceNoteId] = useState<string | null>(
    null,
  );

  const [currentNote, setCurrentNote] = useState<Partial<Note>>({
    title: "",
    content: "",
    labels: [],
  });
  const [shareEmail, setShareEmail] = useState("");
  const [activeNoteId, setActiveNoteId] = useState("");
  const [newLabelName, setNewLabelName] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 5;
  const editorCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchLabels();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchQuery]);

  useEffect(() => {
    if (activeFilter) {
      fetchNotes();
    }
  }, [currentPage, activeFilter]);

  const fetchLabels = async () => {
    try {
      const res = await api.get("/labels");
      setLabels(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotes = async (overrideQuery?: string) => {
    const query = overrideQuery !== undefined ? overrideQuery : searchQuery;
    try {
      const endpoint = query.trim() ? "/search" : "/notes";
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        ...(query.trim() && { q: query.trim() }),
      });

      if (activeFilter.type === "trash") params.append("trash", "true");
      if (activeFilter.type === "label" && activeFilter.id)
        params.append("labelId", activeFilter.id);

      const res = await api.get(`${endpoint}?${params.toString()}`);
      setNotes(res.data.data || []);
      setTotalPages(res.data.meta?.totalPages || 1);
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchNotes(searchQuery);
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    router.push("/login");
  };

  const handleSaveNote = async () => {
    if (!currentNote.title || !currentNote.content) return;

    try {
      if (currentNote.id) {
        await api.put(`/notes/${currentNote.id}`, {
          title: currentNote.title,
          content: currentNote.content,
        });
      } else {
        await api.post("/notes", {
          title: currentNote.title,
          content: currentNote.content,
        });
      }
      closeEditor();
      fetchNotes();
    } catch (err) {
      alert("Failed to save note.");
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const isTrash = activeFilter.type === "trash";
    const msg = isTrash
      ? "Permanently delete this note? This cannot be undone."
      : "Move this note to trash?";

    if (!confirm(msg)) return;

    try {
      await api.delete(`/notes/${id}${isTrash ? "?permanent=true" : ""}`);
      fetchNotes();
    } catch (err) {
      alert("Failed to delete note. You might not be the owner.");
    }
  };

  const handleShare = async () => {
    if (!shareEmail) return;
    try {
      await api.post(`/notes/${activeNoteId}/share`, {
        share_with_email: shareEmail,
      });
      setIsShareOpen(false);
      setShareEmail("");
      alert("Shared successfully!");
    } catch (err) {
      alert("Failed to share note.");
    }
  };

  const handleCreateLabel = async () => {
    if (!newLabelName) return;
    try {
      await api.post("/labels", { name: newLabelName });
      setNewLabelName("");
      fetchLabels();
    } catch (err) {
      alert("Label creation failed.");
    }
  };

  const toggleLabel = async (labelId: string, isAttached: boolean) => {
    if (!currentNote.id) return;
    try {
      if (isAttached) {
        await api.delete(`/notes/${currentNote.id}/labels/${labelId}`);
        setCurrentNote((prev) => ({
          ...prev,
          labels: prev.labels?.filter((l) => l.id !== labelId),
        }));
      } else {
        await api.post(`/notes/${currentNote.id}/labels`, { labelId });
        const label = labels.find((l) => l.id === labelId);
        if (label)
          setCurrentNote((prev) => ({
            ...prev,
            labels: [...(prev.labels || []), label],
          }));
      }
      fetchNotes();
    } catch (err) {
      alert("Failed to toggle label. You might need to save Note first.");
    }
  };

  useLayoutEffect(() => {
    if (!isEditorOpen || !editorCardRef.current) return;

    if (!editorSourceRect) {
      setEditorPhase("open");
      setEditorTransform("translate3d(0, 24px, 0) scale(0.96)");
      requestAnimationFrame(() => setIsEditorAnimatingIn(true));
      return;
    }

    setEditorPhase("expanding");
    const finalRect = editorCardRef.current.getBoundingClientRect();
    const scaleX = editorSourceRect.width / finalRect.width;
    const scaleY = editorSourceRect.height / finalRect.height;
    const translateX = editorSourceRect.left - finalRect.left;
    const translateY = editorSourceRect.top - finalRect.top;

    setEditorTransform(
      `translate3d(${translateX}px, ${translateY}px, 0) scale(${scaleX}, ${scaleY})`,
    );

    requestAnimationFrame(() => setIsEditorAnimatingIn(true));
  }, [isEditorOpen, editorSourceRect]);

  const openEditor = (note?: Note, sourceEl?: HTMLElement | null) => {
    const rect = sourceEl?.getBoundingClientRect();

    setIsEditorAnimatingIn(false);
    setEditorPhase(rect ? "expanding" : "open");
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
    setCurrentNote(note ? { ...note } : { title: "", content: "", labels: [] });
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setIsEditorAnimatingIn(false);
    setEditorPhase("idle");
    setEditorSourceRect(null);
    setHiddenSourceNoteId(null);
  };

  const renderNoteCardContent = (
    note: Pick<Note, "title" | "content" | "labels">,
  ) => (
    <>
      <h3 className="font-semibold text-base text-slate-800 mb-1 truncate pr-8">
        {note.title}
      </h3>
      <p className="text-slate-600 text-sm line-clamp-4 flex-grow mb-2 whitespace-pre-wrap">
        {note.content}
      </p>

      <div className="flex flex-wrap gap-1 mb-2 max-h-6 overflow-hidden">
        {note.labels?.map((label) => (
          <span
            key={label.id}
            className="bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full flex items-center"
          >
            <Tag className="w-3 h-3 mr-1" /> {label.name}
          </span>
        ))}
      </div>
    </>
  );

  if (loading && notes.length === 0)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col p-4 shadow-sm z-10 transition-all">
        <div className="flex items-center space-x-2 font-bold text-xl text-slate-800 mb-8 px-2">
          <FolderOpen className="h-6 w-6 text-blue-600" />
          <span>Fi-Note</span>
        </div>

        <button
          onClick={() => setActiveFilter({ type: "all" })}
          className={`w-full text-left px-4 py-2.5 rounded-lg mb-2 flex items-center font-medium transition-colors ${activeFilter.type === "all" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"}`}
        >
          <FolderOpen className="h-5 w-5 mr-3" /> All Notes
        </button>

        <div className="mt-4 mb-2 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
          LABELS
        </div>
        <div className="flex-grow overflow-y-auto">
          {labels.map((l) => (
            <button
              key={l.id}
              onClick={() => setActiveFilter({ type: "label", id: l.id })}
              className={`w-full text-left px-4 py-2 rounded-lg mb-1 flex items-center text-sm font-medium transition-colors ${activeFilter.id === l.id ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <Tag className="h-4 w-4 mr-3" /> {l.name}
            </button>
          ))}
          <button
            onClick={() => setIsLabelMgrOpen(true)}
            className="w-full text-left px-4 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-100 flex items-center mt-2 border border-dashed border-slate-300"
          >
            <Plus className="h-4 w-4 mr-2" /> New Label
          </button>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <button
            onClick={() => setActiveFilter({ type: "trash" })}
            className={`w-full text-left px-4 py-2.5 rounded-lg mb-4 flex items-center font-medium transition-colors ${activeFilter.type === "trash" ? "bg-red-50 text-red-700" : "text-slate-600 hover:bg-slate-100"}`}
          >
            <Trash2 className="h-5 w-5 mr-3" /> Trash
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center text-slate-500 hover:text-slate-800 transition-colors px-4"
          >
            <LogOut className="h-5 w-5 mr-3" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 p-6 md:p-8 flex flex-col h-screen overflow-hidden">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 shrink-0">
          <h1 className="text-2xl font-bold text-slate-800 capitalize">
            {activeFilter.type === "all"
              ? "All Notes"
              : activeFilter.type === "trash"
                ? "Trash"
                : labels.find((l) => l.id === activeFilter.id)?.name ||
                  "Filtered"}
          </h1>
          <form
            onSubmit={handleSearchSubmit}
            className="flex-grow max-w-md w-full relative"
          >
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value === "") {
                  setCurrentPage(1);
                  fetchNotes("");
                }
              }}
              className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg outline-none bg-white shadow-sm"
            />
          </form>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 flex-grow content-start overflow-y-auto pb-8 pr-2">
          {activeFilter.type !== "trash" && (
            <div
              onClick={(e) => openEditor(undefined, e.currentTarget)}
              className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center text-slate-500 hover:text-slate-800 hover:border-slate-400 hover:bg-slate-50 cursor-pointer h-56 transition-colors"
            >
              <Plus className="h-8 w-8 mb-2" />
              <span className="font-medium">Create Note</span>
            </div>
          )}

          {notes.map((note) => (
            <div
              key={note.id}
              data-note-card="true"
              onClick={(e) => {
                if (activeFilter.type !== "trash")
                  openEditor(note, e.currentTarget);
              }}
              onKeyDown={(e) => {
                if (
                  activeFilter.type !== "trash" &&
                  (e.key === "Enter" || e.key === " ")
                ) {
                  e.preventDefault();
                  openEditor(note, e.currentTarget);
                }
              }}
              tabIndex={activeFilter.type !== "trash" ? 0 : -1}
              role={activeFilter.type !== "trash" ? "button" : undefined}
              className={`bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col h-56 group relative ${
                activeFilter.type !== "trash"
                  ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-2"
                  : ""
              } ${hiddenSourceNoteId === note.id ? "opacity-0" : ""}`}
            >
              {renderNoteCardContent(note)}

              <div className="flex justify-end space-x-1 pt-2 border-t border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                {!activeFilter.type.includes("trash") && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveNoteId(note.id);
                        setIsShareOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 rounded-md"
                      title="Share"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditor(
                          note,
                          e.currentTarget.closest(
                            "[data-note-card='true']",
                          ) as HTMLElement | null,
                        );
                      }}
                      className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-green-600 rounded-md"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={(e) => handleDelete(note.id, e)}
                  className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 rounded-md"
                  title={activeFilter.type === "trash" ? "Trashed" : "Trash"}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center mt-4 space-x-4 bg-white p-2 rounded-lg shadow-sm border border-slate-100 max-w-fit mx-auto shrink-0">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </main>

      {/* Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4 z-50 animate-[editorBackdropFade_180ms_ease-out]">
          <div
            ref={editorCardRef}
            onTransitionEnd={(e) => {
              if (
                e.target === e.currentTarget &&
                e.propertyName === "transform" &&
                editorPhase === "expanding"
              ) {
                setEditorPhase("open");
                setHiddenSourceNoteId(null);
              }
            }}
            style={{
              transformOrigin: "top left",
              transform: isEditorAnimatingIn
                ? "translate3d(0, 0, 0) scale(1)"
                : editorTransform,
              opacity: isEditorAnimatingIn ? 1 : 0.92,
              transition:
                `transform ${EDITOR_EXPAND_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity 320ms ease-out`,
            }}
            className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] will-change-transform relative"
          >
            <div
              style={{
                opacity: isEditorOpen ? 1 : 0,
                transform: "translateY(0)",
                transition: "opacity 120ms ease-out",
              }}
              className="flex flex-col max-h-[90vh] min-h-0"
            >
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <input
                  type="text"
                  placeholder="Note Title"
                  value={currentNote.title}
                  onChange={(e) =>
                    setCurrentNote({ ...currentNote, title: e.target.value })
                  }
                  className="text-xl font-bold bg-transparent outline-none w-full text-slate-800 placeholder:text-slate-300"
                />
              </div>

              {currentNote.id && (
                <div className="px-4 py-2 border-b border-slate-100 bg-white flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-semibold text-slate-400 uppercase mr-2">
                    Tags:
                  </span>
                  {labels.map((lbl) => {
                    const hasLabel = currentNote.labels?.some(
                      (l) => l.id === lbl.id,
                    );
                    return (
                      <button
                        key={lbl.id}
                        onClick={() => toggleLabel(lbl.id, !!hasLabel)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center ${hasLabel ? "bg-blue-100 border-blue-200 text-blue-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                      >
                        <Tag className="w-3 h-3 mr-1" /> {lbl.name}
                      </button>
                    );
                  })}
                </div>
              )}

              <textarea
                placeholder="Write your thoughts..."
                value={currentNote.content}
                onChange={(e) =>
                  setCurrentNote({ ...currentNote, content: e.target.value })
                }
                className="p-6 w-full flex-grow resize-none outline-none text-slate-600 h-[300px]"
              />
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                <span className="text-xs text-slate-400">
                  {!currentNote.id ? "Save once to attach labels" : ""}
                </span>
                <div className="space-x-3">
                  <button
                    onClick={closeEditor}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNote}
                    className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {isShareOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">
              Share Note
            </h3>
            <input
              type="email"
              placeholder="user@example.com"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg mb-4 outline-none"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsShareOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleShare}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg font-medium text-sm"
              >
                Share
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Label Manager Modal */}
      {isLabelMgrOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              Create New Label
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Organize your notes easily.
            </p>
            <input
              type="text"
              placeholder="Work, Personal, Ideas..."
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg mb-4 outline-none"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsLabelMgrOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm"
              >
                Close
              </button>
              <button
                onClick={handleCreateLabel}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg font-medium text-sm"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

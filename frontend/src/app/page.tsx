"use client";

import { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from "react";
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
  Sun,
  Moon,
  ShieldCheck,
} from "lucide-react";

interface Label {
  id: string;
  name: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  color?: string;
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

// Color Palette Mapping: Maps a single "theme color" key to light/dark hex versions
const COLOR_PALETTE = [
  { id: "default", name: "Default", light: "#ffffff", dark: "#202124" },
  { id: "slate", name: "Slate", light: "#f1f5f9", dark: "#2d2e31" },
  { id: "sand", name: "Sand", light: "#fafaf9", dark: "#3c3d3f" },
  { id: "red", name: "Red", light: "#fee2e2", dark: "#442726" },
  { id: "amber", name: "Amber", light: "#fef3c7", dark: "#41331c" },
  { id: "emerald", name: "Emerald", light: "#dcfce7", dark: "#1e3a1f" },
  { id: "cyan", name: "Cyan", light: "#cffafe", dark: "#1a3b44" },
  { id: "indigo", name: "Indigo", light: "#e0e7ff", dark: "#262a4d" },
  { id: "rose", name: "Rose", light: "#ffe4e6", dark: "#422230" },
];

export default function Dashboard() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeFilter, setActiveFilter] = useState<{
    type: "all" | "trash" | "label";
    id?: string;
  }>({ type: "all" });

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [labelMgrState, setLabelMgrState] = useState<{
    isOpen: boolean;
    mode: "create" | "edit";
    editingId?: string;
  }>({ isOpen: false, mode: "create" });
  
  const [editorSourceRect, setEditorSourceRect] = useState<EditorSourceRect | null>(null);
  const [editorTransform, setEditorTransform] = useState("translate3d(0, 0, 0) scale(1)");
  const [isEditorAnimatingIn, setIsEditorAnimatingIn] = useState(false);
  const [editorPhase, setEditorPhase] = useState<"idle" | "expanding" | "open">("idle");
  const [hiddenSourceNoteId, setHiddenSourceNoteId] = useState<string | null>(null);

  const [currentNote, setCurrentNote] = useState<Partial<Note>>({
    title: "", content: "", color: "default", labels: [],
  });
  const [shareEmail, setShareEmail] = useState("");
  const [activeNoteId, setActiveNoteId] = useState("");
  const [labelInput, setLabelInput] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 12;
  const editorCardRef = useRef<HTMLDivElement | null>(null);

  // Persistence and Initial Theme Load - Default to DARK
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    // Default to dark if no saved preference exists
    const shouldBeDark = savedTheme !== "light";
    
    setIsDarkMode(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
      if (!savedTheme) localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const newVal = !prev;
      if (newVal) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      }
      return newVal;
    });
  };

  // Helper to get hex from an ID or legacy hex
  const resolveHex = useCallback((colorValue: string | undefined, dark: boolean) => {
    if (!colorValue) return dark ? "#202124" : "#ffffff";
    
    // Try to find by ID first
    const found = COLOR_PALETTE.find(c => c.id === colorValue || c.light === colorValue || c.dark === colorValue);
    if (found) {
      return dark ? found.dark : found.light;
    }
    
    // Fallback if it's an unknown hex
    return colorValue;
  }, []);

  const fetchLabels = useCallback(async () => {
    try {
      const res = await api.get("/labels");
      setLabels(res.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchNotes = useCallback(async (overrideQuery?: string) => {
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
  }, [activeFilter, currentPage, searchQuery, router]);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchQuery]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

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
      const payload = {
        title: currentNote.title,
        content: currentNote.content,
        color: currentNote.color || "default",
      };
      if (currentNote.id) {
        await api.put(`/notes/${currentNote.id}`, payload);
      } else {
        await api.post("/notes", payload);
      }
      closeEditor();
      fetchNotes();
    } catch (err) {
      alert("Save failed.");
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isTrash = activeFilter.type === "trash";
    if (!confirm(isTrash ? "Permanently delete?" : "Archive record?")) return;
    try {
      await api.delete(`/notes/${id}${isTrash ? "?permanent=true" : ""}`);
      fetchNotes();
    } catch (err) {
      alert("Delete failed.");
    }
  };

  const handleShare = async () => {
    if (!shareEmail) return;
    try {
      await api.post(`/notes/${activeNoteId}/share`, { share_with_email: shareEmail });
      setIsShareOpen(false);
      setShareEmail("");
      alert("Shared!");
    } catch (err) {
      alert("Share failed.");
    }
  };

  const handleLabelAction = async () => {
    if (!labelInput.trim()) return;
    try {
      if (labelMgrState.mode === "create") {
        await api.post("/labels", { name: labelInput });
      } else if (labelMgrState.editingId) {
        await api.put(`/labels/${labelMgrState.editingId}`, { name: labelInput });
      }
      setLabelInput("");
      setLabelMgrState({ isOpen: false, mode: "create" });
      fetchLabels();
    } catch (err) {
      alert("Operation failed. Category might already exist.");
    }
  };

  const toggleLabel = async (labelId: string, isAttached: boolean) => {
    if (!currentNote.id) return;
    try {
      if (isAttached) {
        await api.delete(`/notes/${currentNote.id}/labels/${labelId}`);
        setCurrentNote((prev) => ({ ...prev, labels: prev.labels?.filter((l) => l.id !== labelId) }));
      } else {
        await api.post(`/notes/${currentNote.id}/labels`, { labelId });
        const label = labels.find((l) => l.id === labelId);
        if (label) setCurrentNote((prev) => ({ ...prev, labels: [...(prev.labels || []), label] }));
      }
      fetchNotes();
    } catch (err) {
      alert("Label toggle failed.");
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
    setEditorTransform(`translate3d(${translateX}px, ${translateY}px, 0) scale(${scaleX}, ${scaleY})`);
    requestAnimationFrame(() => setIsEditorAnimatingIn(true));
  }, [isEditorOpen, editorSourceRect]);

  const openEditor = (note?: Note, sourceEl?: HTMLElement | null) => {
    const rect = sourceEl?.getBoundingClientRect();
    setIsEditorAnimatingIn(false);
    setEditorPhase(rect ? "expanding" : "open");
    setEditorSourceRect(rect ? { width: rect.width, height: rect.height, top: rect.top, left: rect.left } : null);
    setHiddenSourceNoteId(note?.id ?? null);
    
    if (note) {
      // Find the ID in our palette if it's saved as hex
      const foundColor = COLOR_PALETTE.find(c => c.light === note.color || c.dark === note.color || c.id === note.color);
      setCurrentNote({ ...note, color: foundColor ? foundColor.id : "default" });
    } else {
      setCurrentNote({ title: "", content: "", color: "default", labels: [] });
    }
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setIsEditorAnimatingIn(false);
    setEditorPhase("idle");
    setEditorSourceRect(null);
    setHiddenSourceNoteId(null);
  };

  const renderNoteCardContent = (note: Note) => {
    const hex = resolveHex(note.color, isDarkMode);
    return (
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-start mb-2 relative z-10">
          <h3 className="font-bold text-sm leading-tight truncate pr-2 text-slate-900 dark:text-zinc-50">{note.title}</h3>
          <div className="text-[9px] text-slate-400 dark:text-zinc-500 font-black uppercase shrink-0">{new Date(note.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
        </div>
        <p className="text-slate-600 dark:text-zinc-300 text-xs leading-relaxed line-clamp-3 flex-grow mb-3 font-medium relative z-10">{note.content}</p>
        <div className="flex flex-wrap gap-1 mt-auto relative z-10">
          {note.labels?.slice(0, 2).map((label) => (
            <span key={label.id} className="bg-black/5 dark:bg-white/10 text-slate-800 dark:text-zinc-200 text-[8px] font-black px-1.5 py-0.5 rounded uppercase border border-black/5 dark:border-white/5">{label.name}</span>
          ))}
        </div>
      </div>
    );
  };

  if (loading && notes.length === 0)
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#202124] font-black text-slate-900 dark:text-zinc-50 text-2xl animate-pulse">VAULT_INIT</div>;

  return (
    <div className={`min-h-screen ${isDarkMode ? "dark" : ""} flex font-sans selection:bg-slate-900 selection:text-white dark:selection:bg-white dark:selection:text-slate-900 transition-colors duration-300`}>
      <div className="flex w-full bg-slate-50 dark:bg-[#202124] transition-colors duration-300">
        
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-200 dark:border-zinc-800 flex flex-col z-20 bg-slate-50 dark:bg-[#202124] shrink-0">
          <div className="p-6">
            <div className="flex items-center space-x-3 cursor-default">
              <div className="h-8 w-8 bg-slate-900 dark:bg-zinc-50 rounded-lg flex items-center justify-center shadow-lg">
                <ShieldCheck className="h-5 w-5 text-white dark:text-zinc-950" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-tight leading-none text-slate-900 dark:text-white">Fi-Money</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mt-0.5">Vault Edition</span>
              </div>
            </div>
          </div>

          <nav className="flex-grow px-3 space-y-0.5 overflow-y-auto custom-scrollbar">
            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 dark:text-zinc-600 uppercase tracking-widest">Navigation</div>
            <button
              onClick={() => setActiveFilter({ type: "all" })}
              className={`w-full text-left px-3 py-2 rounded-xl flex items-center group transition-all ${
                activeFilter.type === "all" ? "bg-white dark:bg-zinc-900 shadow-sm border border-slate-200 dark:border-zinc-800" : "text-slate-600 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-zinc-900/50"
              }`}
            >
              <FolderOpen className={`h-4 w-4 mr-3 transition-colors ${activeFilter.type === "all" ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-zinc-600"}`} />
              <span className="font-bold text-xs text-slate-900 dark:text-white">Records</span>
            </button>

            <div className="mt-6 px-3 py-2 text-[10px] font-bold text-slate-400 dark:text-zinc-600 uppercase tracking-widest">Categories</div>
            {labels.map((l) => (
              <div key={l.id} className="group relative">
                <button
                  onClick={() => setActiveFilter({ type: "label", id: l.id })}
                  className={`w-full text-left px-3 py-1.5 rounded-lg flex items-center transition-all ${
                    activeFilter.id === l.id ? "bg-white dark:bg-zinc-900 shadow-sm border border-slate-200 dark:border-zinc-800 font-black" : "text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-zinc-900/50"
                  }`}
                >
                  <div className={`h-1.5 w-1.5 rounded-full mr-3 ${activeFilter.id === l.id ? "bg-slate-900 dark:bg-zinc-50" : "bg-slate-300 dark:bg-zinc-700"}`} />
                  <span className="text-xs truncate flex-grow text-slate-900 dark:text-zinc-100">{l.name}</span>
                  <Edit2 onClick={(e) => { e.stopPropagation(); setLabelInput(l.name); setLabelMgrState({ isOpen: true, mode: "edit", editingId: l.id }); }} className="h-3 w-3 opacity-0 group-hover:opacity-100 cursor-pointer text-slate-900 dark:text-zinc-100" />
                </button>
              </div>
            ))}
            <button onClick={() => { setLabelInput(""); setLabelMgrState({ isOpen: true, mode: "create" }); }} className="w-full text-left px-3 py-1.5 rounded-lg text-[10px] text-slate-400 dark:text-zinc-600 hover:text-slate-900 dark:hover:text-zinc-200 flex items-center mt-2 group">
              <Plus className="h-3 w-3 mr-3" />
              <span className="font-bold uppercase">New Category</span>
            </button>
          </nav>

          <div className="p-4 mt-auto border-t border-slate-200 dark:border-zinc-800 space-y-1">
            <button onClick={toggleTheme} className="w-full text-left px-3 py-2 rounded-xl flex items-center text-slate-600 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-zinc-900/50 transition-all">
              {isDarkMode ? <Sun className="h-4 w-4 mr-3" /> : <Moon className="h-4 w-4 mr-3" />}
              <span className="text-xs font-bold">{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
            </button>
            <button onClick={() => setActiveFilter({ type: "trash" })} className={`w-full text-left px-3 py-2 rounded-xl flex items-center transition-all ${activeFilter.type === "trash" ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 font-bold" : "text-slate-500 dark:text-zinc-400"}`}>
              <Trash2 className="h-4 w-4 mr-3" />
              <span className="text-xs font-bold">Archive</span>
            </button>
            <button onClick={handleLogout} className="w-full flex items-center text-slate-400 dark:text-zinc-600 hover:text-slate-900 dark:hover:text-zinc-200 px-3 py-2 transition-all">
              <LogOut className="h-4 w-4 mr-3" />
              <span className="text-xs font-bold">Log Out</span>
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-[#202124] transition-colors duration-300">
          <header className="p-6 pb-2 flex justify-between items-center gap-4 shrink-0">
            <div className="min-w-0">
              <h1 className="text-xl font-black tracking-tight truncate capitalize text-slate-900 dark:text-zinc-50">
                {activeFilter.type === "all" ? "Master Ledger" : activeFilter.type === "trash" ? "Archive" : labels.find((l) => l.id === activeFilter.id)?.name || "Filtered"}
              </h1>
              <p className="text-slate-400 dark:text-zinc-500 text-[9px] font-black uppercase tracking-widest">{notes.length} Total Nodes</p>
            </div>
            <form onSubmit={handleSearchSubmit} className="flex-grow max-w-xs relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-slate-900 dark:group-focus-within:text-zinc-100 transition-colors" />
              <input
                type="text" placeholder="Query..." value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); if (!e.target.value) { setCurrentPage(1); fetchNotes(""); } }}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 text-xs font-medium focus:border-slate-900 dark:focus:border-zinc-600 transition-all"
              />
            </form>
          </header>

          <div className="flex-grow overflow-y-auto px-6 pb-12 mt-4 custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 content-start max-w-[1800px]">
              {activeFilter.type !== "trash" && (
                <button onClick={(e) => openEditor(undefined, e.currentTarget)} className="border border-dashed border-slate-300 dark:border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-center text-slate-400 dark:text-zinc-600 hover:text-slate-900 dark:hover:text-zinc-200 hover:border-slate-900 dark:hover:border-zinc-600 cursor-pointer h-40 transition-all shadow-sm">
                  <Plus className="h-5 w-5 mb-2" />
                  <span className="font-black uppercase tracking-widest text-[8px]">New Record</span>
                </button>
              )}
              {notes.map((note) => {
                const hex = resolveHex(note.color, isDarkMode);
                return (
                  <div
                    key={note.id} data-note-card="true"
                    onClick={(e) => activeFilter.type !== "trash" && openEditor(note, e.currentTarget)}
                    style={{ backgroundColor: hex }}
                    className={`group border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col h-40 relative overflow-hidden ${activeFilter.type !== "trash" ? "cursor-pointer hover:-translate-y-0.5" : ""} ${hiddenSourceNoteId === note.id ? "opacity-0" : ""}`}
                  >
                    <div className="absolute top-0 right-0 w-12 h-12 bg-black/[0.03] dark:bg-white/[0.03] rounded-full -mr-6 -mt-6" />
                    {renderNoteCardContent(note)}
                    {/* Actions */}
                    <div className="absolute bottom-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      {!activeFilter.type.includes("trash") && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); setActiveNoteId(note.id); setIsShareOpen(true); }} className="p-1 bg-white dark:bg-zinc-800 rounded shadow-sm hover:bg-slate-900 dark:hover:bg-zinc-50 text-slate-600 dark:text-zinc-400 hover:text-white dark:hover:text-zinc-950 transition-all border border-slate-100 dark:border-zinc-700"><Share2 className="h-3 w-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); openEditor(note, e.currentTarget.closest("[data-note-card='true']") as HTMLElement | null); }} className="p-1 bg-white dark:bg-zinc-800 rounded shadow-sm hover:bg-slate-900 dark:hover:bg-zinc-50 text-slate-600 dark:text-zinc-400 hover:text-white dark:hover:text-zinc-950 transition-all border border-slate-100 dark:border-zinc-700"><Edit2 className="h-3 w-3" /></button>
                        </>
                      )}
                      <button onClick={(e) => handleDelete(note.id, e)} className="p-1 bg-white dark:bg-zinc-800 rounded shadow-sm hover:bg-red-600 hover:text-white text-slate-600 dark:text-zinc-400 transition-all border border-slate-100 dark:border-zinc-700"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center items-center mt-10 space-x-2 bg-white dark:bg-zinc-900 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-800 max-w-fit mx-auto">
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-20 transition-all text-slate-600 dark:text-zinc-400"><ChevronLeft className="h-4 w-4" /></button>
                <div className="px-3 font-black text-[10px] text-slate-900 dark:text-zinc-100">{currentPage} / {totalPages}</div>
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-20 transition-all text-slate-600 dark:text-zinc-400"><ChevronRight className="h-4 w-4" /></button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center px-4 z-50 transition-all">
          <div
            ref={editorCardRef}
            style={{
              transformOrigin: "top left",
              transform: isEditorAnimatingIn ? "translate3d(0, 0, 0) scale(1)" : editorTransform,
              opacity: isEditorAnimatingIn ? 1 : 0,
              backgroundColor: resolveHex(currentNote.color, isDarkMode),
              transition: `transform ${EDITOR_EXPAND_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity 320ms ease-out, background-color 200ms ease`,
            }}
            className="rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] will-change-transform border border-white/20 dark:border-zinc-800"
          >
            <div className="flex flex-col max-h-[85vh] min-h-0">
              <div className="p-6 border-b border-black/5 dark:border-white/5">
                <input
                  type="text" placeholder="Subject..." value={currentNote.title}
                  onChange={(e) => setCurrentNote({ ...currentNote, title: e.target.value })}
                  className="text-xl font-black bg-transparent outline-none w-full tracking-tight text-slate-900 dark:text-zinc-50"
                />
              </div>
              {currentNote.id && (
                <div className="px-6 py-2 border-b border-black/5 dark:border-white/5 flex flex-wrap gap-2 items-center">
                  <span className="text-[9px] font-black opacity-50 uppercase tracking-widest mr-2 text-slate-500 dark:text-zinc-400">Indexing:</span>
                  {labels.map((lbl) => {
                    const hasLabel = currentNote.labels?.some((l) => l.id === lbl.id);
                    return (
                      <button key={lbl.id} onClick={() => toggleLabel(lbl.id, !!hasLabel)} className={`text-[9px] font-black px-2.5 py-0.5 rounded-full transition-all uppercase ${hasLabel ? "bg-slate-900 dark:bg-zinc-50 text-white dark:text-zinc-950" : "bg-black/5 dark:bg-white/10 text-slate-600 dark:text-zinc-400"}`}>{lbl.name}</button>
                    );
                  })}
                </div>
              )}
              <textarea
                placeholder="Secure data entry..." value={currentNote.content}
                onChange={(e) => setCurrentNote({ ...currentNote, content: e.target.value })}
                className="p-6 w-full flex-grow resize-none outline-none bg-transparent h-[300px] text-base font-medium leading-relaxed text-slate-800 dark:text-zinc-100"
              />
              <div className="p-6 border-t border-black/5 dark:border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex flex-wrap gap-2">
                  {COLOR_PALETTE.map((c) => (
                    <button 
                      key={c.id} 
                      onClick={() => setCurrentNote({ ...currentNote, color: c.id })} 
                      className={`w-6 h-6 rounded-full border border-black/20 dark:border-white/20 transition-all ${currentNote.color === c.id ? "ring-2 ring-slate-900 dark:ring-zinc-50 ring-offset-1 scale-105" : "hover:scale-110"}`} 
                      style={{ backgroundColor: isDarkMode ? c.dark : c.light }} 
                    />
                  ))}
                </div>
                <div className="flex space-x-3">
                  <button onClick={closeEditor} className="px-4 py-2 font-bold text-[10px] uppercase text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-50">Discard</button>
                  <button onClick={handleSaveNote} className="px-6 py-2 bg-slate-900 dark:bg-zinc-50 text-white dark:text-zinc-950 rounded-xl font-black text-[10px] uppercase shadow-md transition-all hover:scale-105 active:scale-95">Commit Changes</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Label Modal */}
      {labelMgrState.isOpen && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl w-full max-w-sm p-6 border border-slate-200 dark:border-zinc-800">
            <h3 className="text-lg font-black tracking-tight mb-1 text-slate-900 dark:text-zinc-50">{labelMgrState.mode === "create" ? "New Category" : "Edit Category"}</h3>
            <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-4">Define System Parameter</p>
            <input
              autoFocus type="text" value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLabelAction()}
              className="w-full p-3 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none bg-slate-50 dark:bg-zinc-950 text-xs font-medium focus:border-slate-900 dark:focus:border-zinc-600 transition-all mb-4 text-slate-900 dark:text-zinc-100"
            />
            <div className="flex justify-end space-x-3">
              <button onClick={() => setLabelMgrState({ isOpen: false, mode: "create" })} className="px-4 py-2 text-[10px] font-bold uppercase text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-50">Cancel</button>
              <button onClick={handleLabelAction} className="px-5 py-2 bg-slate-900 dark:bg-zinc-50 text-white dark:text-zinc-950 rounded-lg font-black text-[10px] uppercase shadow-md">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {isShareOpen && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-xl w-full max-w-sm p-6 border border-slate-200 dark:border-zinc-800">
            <h3 className="text-lg font-black tracking-tight mb-1 text-slate-900 dark:text-zinc-50">Distribute</h3>
            <p className="text-[9px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-4">Authorize Shared Access</p>
            <input
              type="email" placeholder="recipient@vault.net" value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              className="w-full p-3 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none bg-slate-50 dark:bg-zinc-950 text-xs font-medium mb-4 text-slate-900 dark:text-zinc-100"
            />
            <div className="flex justify-end space-x-3">
              <button onClick={() => setIsShareOpen(false)} className="px-4 py-2 text-[10px] font-bold uppercase text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-50">Cancel</button>
              <button onClick={handleShare} className="px-5 py-2 bg-slate-900 dark:bg-zinc-50 text-white dark:text-zinc-950 rounded-lg font-black text-[10px] uppercase shadow-md">Transfer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

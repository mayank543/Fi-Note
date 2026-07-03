"use client";

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  isGuest,
  enableGuest,
  disableGuest,
  getGuestNotes,
  getGuestLabels,
  createGuestNote,
  updateGuestNote,
  deleteGuestNote,
  createGuestLabel,
  updateGuestLabel,
  deleteGuestLabel,
} from "@/lib/guest";
import {
  Plus,
  LogOut,
  Edit2,
  Trash2,
  Share2,
  Search,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Sun,
  Moon,
  ShieldCheck,
  Menu,
  X,
  Users,
  UserPlus,
  LogIn,
} from "lucide-react";

interface Label {
  id: string;
  name: string;
}

interface Collaborator {
  user: {
    email: string;
  };
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
  shared_with: Collaborator[];
}

interface EditorSourceRect {
  width: number;
  height: number;
  top: number;
  left: number;
}

const EDITOR_EXPAND_MS = 380;

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
  const [authMode, setAuthMode] = useState<"loading" | "authenticated" | "guest" | "none">("loading");
  const router = useRouter();
  
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const shouldBeDark = savedTheme !== "light";
    setIsDarkMode(shouldBeDark);
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

  const resolveHex = useCallback((colorValue: string | undefined, dark: boolean) => {
    if (!colorValue) return dark ? "#202124" : "#ffffff";
    const found = COLOR_PALETTE.find(c => c.id === colorValue || c.light === colorValue || c.dark === colorValue);
    return found ? (dark ? found.dark : found.light) : colorValue;
  }, []);

  const fetchLabels = useCallback(async () => {
    const mode = authMode === "loading"
      ? (localStorage.getItem("access_token") ? "authenticated" : isGuest() ? "guest" : "none")
      : authMode;

    if (mode === "guest") {
      setLabels(getGuestLabels());
      return;
    }

    try {
      const res = await api.get("/labels");
      setLabels(res.data || []);
    } catch (err) {
      console.error(err);
    }
  }, [authMode]);

  const fetchNotes = useCallback(async (overrideQuery?: string) => {
    const mode = authMode === "loading"
      ? (localStorage.getItem("access_token") ? "authenticated" : isGuest() ? "guest" : "none")
      : authMode;

    if (mode === "guest") {
      let filtered = getGuestNotes();
      const query = overrideQuery !== undefined ? overrideQuery : searchQuery;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        filtered = filtered.filter(
          (n) =>
            n.title.toLowerCase().includes(q) ||
            n.content.toLowerCase().includes(q),
        );
      }
      if (activeFilter.type === "trash") {
        filtered = filtered.filter((n) => n.is_trashed);
      } else {
        filtered = filtered.filter((n) => !n.is_trashed);
      }
      if (activeFilter.type === "label" && activeFilter.id) {
        filtered = filtered.filter((n) =>
          n.labels.some((l) => l.id === activeFilter.id),
        );
      }
      const total = filtered.length;
      const paged = filtered.slice(
        (currentPage - 1) * limit,
        currentPage * limit,
      );
      setNotes(paged as unknown as Note[]);
      setTotalPages(Math.ceil(total / limit) || 1);
      setLoading(false);
      return;
    }

    const query = overrideQuery !== undefined ? overrideQuery : searchQuery;
    try {
      const endpoint = query.trim() ? "/search" : "/notes";
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        ...(query.trim() && { q: query.trim() }),
      });
      if (activeFilter.type === "trash") params.append("trash", "true");
      if (activeFilter.type === "label" && activeFilter.id) params.append("labelId", activeFilter.id);
      const res = await api.get(`${endpoint}?${params.toString()}`);
      setNotes(res.data.data || []);
      setTotalPages(res.data.meta?.totalPages || 1);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err && (err as any).response?.status === 401) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [activeFilter, currentPage, searchQuery, router, authMode]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      setAuthMode("authenticated");
      fetchLabels();
    } else if (isGuest()) {
      setAuthMode("guest");
      setNotes(getGuestNotes() as unknown as Note[]);
      setLabels(getGuestLabels());
      setLoading(false);
    } else {
      setAuthMode("none");
      setLoading(false);
    }
  }, [fetchLabels]);

  useEffect(() => {
    if (authMode === "none") return;
    setCurrentPage(1);
  }, [activeFilter, searchQuery, authMode]);

  useEffect(() => {
    if (authMode === "none" || authMode === "loading") return;
    fetchNotes();
  }, [fetchNotes, authMode]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchNotes(searchQuery);
  };

  const handleLogout = () => {
    if (authMode === "guest") {
      disableGuest();
      setAuthMode("none");
      setNotes([]);
      setLabels([]);
    } else {
      localStorage.removeItem("access_token");
      router.push("/login");
    }
  };

  const handleSaveNote = async () => {
    if (!currentNote.title || !currentNote.content) return;
    if (authMode === "guest") {
      const payload = {
        title: currentNote.title,
        content: currentNote.content,
        color: currentNote.color || "default",
      };
      if (currentNote.id) {
        updateGuestNote(currentNote.id, payload);
      } else {
        const created = createGuestNote(payload);
        setCurrentNote((prev) => ({ ...prev, id: created.id }));
      }
      closeEditor();
      fetchNotes();
      showToast(currentNote.id ? "Protocol Synchronized: Record Updated" : "Protocol Initialized: New Entry Secured", "success");
      return;
    }

    try {
      const payload = {
        title: currentNote.title,
        content: currentNote.content,
        color: currentNote.color || "default",
      };
      if (currentNote.id) await api.put(`/notes/${currentNote.id}`, payload);
      else await api.post("/notes", payload);
      closeEditor();
      fetchNotes();
      showToast(currentNote.id ? "Protocol Synchronized: Record Updated" : "Protocol Initialized: New Entry Secured", "success");
    } catch (err) { showToast("Protocol Failure: Save Error Detected", "error"); }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isTrash = activeFilter.type === "trash";
    if (authMode === "guest") {
      deleteGuestNote(id, isTrash);
      fetchNotes();
      showToast(isTrash ? "Vault Cleared: Data Purged" : "Record Archived: Moved to Cold Storage", "success");
      return;
    }
    try {
      await api.delete(`/notes/${id}${isTrash ? "?permanent=true" : ""}`);
      fetchNotes();
      showToast(isTrash ? "Vault Cleared: Data Purged" : "Record Archived: Moved to Cold Storage", "success");
    } catch (err) { showToast("Security Conflict: Deletion Rejected", "error"); }
  };

  const handleShare = async () => {
    if (!shareEmail) return;
    setIsShareOpen(false);
    setShareEmail("");
    showToast("Email Service: Work in Progress 🚧", "info");
  };

  const handleLabelAction = async () => {
    if (!labelInput.trim()) return;
    if (authMode === "guest") {
      if (labelMgrState.mode === "create") createGuestLabel(labelInput);
      else if (labelMgrState.editingId) updateGuestLabel(labelMgrState.editingId, labelInput);
      setLabelInput("");
      setLabelMgrState({ isOpen: false, mode: "create" });
      fetchLabels();
      showToast("System parameter updated.", "success");
      return;
    }
    try {
      if (labelMgrState.mode === "create") await api.post("/labels", { name: labelInput });
      else if (labelMgrState.editingId) await api.put(`/labels/${labelMgrState.editingId}`, { name: labelInput });
      setLabelInput("");
      setLabelMgrState({ isOpen: false, mode: "create" });
      fetchLabels();
      showToast("System parameter updated.", "success");
    } catch (err) { showToast("Protocol failed: Category error.", "error"); }
  };

  const toggleLabel = async (labelId: string, isAttached: boolean) => {
    if (!currentNote.id) return;
    if (authMode === "guest") {
      const note = getGuestNotes().find((n) => n.id === currentNote.id);
      if (!note) return;
      const updatedLabels = isAttached
        ? note.labels.filter((l) => l.id !== labelId)
        : [...note.labels, labels.find((l) => l.id === labelId)!].filter(Boolean);
      updateGuestNote(currentNote.id, { labels: updatedLabels });
      setCurrentNote((prev) => ({ ...prev, labels: updatedLabels }));
      fetchNotes();
      return;
    }
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
    } catch (err) { showToast("Protocol failed: Label toggle.", "error"); }
  };

  useLayoutEffect(() => {
    if (!isEditorOpen || !editorCardRef.current) return;
    
    if (!editorSourceRect || window.innerWidth < 768) {
      setEditorTransform("translate3d(0, 0, 0) scale(1)");
      // For mobile or no source, just fade in
      const raf = requestAnimationFrame(() => {
        setIsEditorAnimatingIn(true);
      });
      return () => cancelAnimationFrame(raf);
    }

    // FLIP Animation Logic
    const finalRect = editorCardRef.current.getBoundingClientRect();
    
    // Invert
    const scaleX = editorSourceRect.width / finalRect.width;
    const scaleY = editorSourceRect.height / finalRect.height;
    const translateX = editorSourceRect.left - finalRect.left;
    const translateY = editorSourceRect.top - finalRect.top;
    
    setEditorTransform(`translate3d(${translateX}px, ${translateY}px, 0) scale(${scaleX}, ${scaleY})`);
    
    // Play: We need a double RAF to ensure the browser has applied the 'Invert' transform
    // before we remove it to start the transition.
    let raf2: number;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setIsEditorAnimatingIn(true);
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [isEditorOpen, editorSourceRect]);

  const openEditor = (note?: Note, sourceEl?: HTMLElement | null) => {
    // Ensure we reset animation state before opening
    setIsEditorAnimatingIn(false);
    
    // Find the actual card element if a sub-element was clicked
    const cardEl = sourceEl?.closest('[data-note-card="true"]') as HTMLElement || sourceEl;
    const rect = cardEl?.getBoundingClientRect();
    
    setEditorSourceRect(rect ? { width: rect.width, height: rect.height, top: rect.top, left: rect.left } : null);
    setHiddenSourceNoteId(note?.id ?? null);
    
    if (note) {
      const foundColor = COLOR_PALETTE.find(c => c.light === note.color || c.dark === note.color || c.id === note.color);
      setCurrentNote({ ...note, color: foundColor ? foundColor.id : "default" });
    } else {
      setCurrentNote({ title: "", content: "", color: "default", labels: [] });
    }
    
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorAnimatingIn(false);
    // Short delay before closing the modal to allow for a close animation if desired, 
    // but here we'll just close it to be snappy.
    setIsEditorOpen(false);
    setEditorSourceRect(null);
    setHiddenSourceNoteId(null);
  };

  const renderNoteCardContent = (note: Note) => (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-start mb-2 relative z-10 text-slate-900 dark:text-zinc-50">
        <h3 className="font-bold text-sm leading-tight truncate pr-2">{note.title}</h3>
        <div className="text-[9px] text-slate-400 dark:text-zinc-500 font-black uppercase shrink-0">{new Date(note.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
      </div>
      <p className="text-slate-600 dark:text-zinc-300 text-xs leading-relaxed line-clamp-3 flex-grow mb-3 font-medium relative z-10">{note.content}</p>
      
      <div className="flex flex-col gap-2 mt-auto relative z-10">
        {/* Collaborators UI */}
        {note.shared_with && note.shared_with.length > 0 && (
          <div className="flex items-center -space-x-2 overflow-hidden mb-1">
            <div className="bg-slate-200 dark:bg-zinc-800 p-1 rounded-full z-10 border border-white dark:border-zinc-900" title={`${note.shared_with.length} Collaborator(s)`}>
              <Users className="w-2.5 h-2.5 text-slate-500 dark:text-zinc-400" />
            </div>
            {note.shared_with.slice(0, 3).map((collab, idx) => (
              <div key={idx} className="h-4.5 w-4.5 rounded-full bg-slate-900 dark:bg-zinc-100 flex items-center justify-center text-[7px] font-black text-white dark:text-zinc-950 border border-white dark:border-zinc-900 uppercase" title={collab.user.email}>
                {collab.user.email[0]}
              </div>
            ))}
            {note.shared_with.length > 3 && (
              <div className="text-[7px] font-bold text-slate-400 ml-3">+{note.shared_with.length - 3}</div>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-1">
          {note.labels?.slice(0, 2).map((label) => (
            <span key={label.id} className="bg-black/5 dark:bg-white/10 text-slate-800 dark:text-zinc-200 text-[8px] font-black px-1.5 py-0.5 rounded uppercase border border-black/5 dark:border-white/5">{label.name}</span>
          ))}
        </div>
      </div>
    </div>
  );

  if (loading && notes.length === 0 && authMode !== "none")
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#202124]">
        <div className="relative">
          <div className="h-16 w-16 bg-slate-900 dark:bg-zinc-50 rounded-2xl flex items-center justify-center shadow-2xl animate-bounce">
            <ShieldCheck className="h-10 w-10 text-white dark:text-zinc-950" />
          </div>
        </div>
        <div className="mt-8 flex flex-col items-center">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500 animate-pulse">
            Initializing Vault
          </h2>
          <div className="mt-2 h-1 w-32 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-slate-900 dark:bg-zinc-50 w-1/2 animate-[loading_1.5s_infinite_ease-in-out]" />
          </div>
        </div>
      </div>
    );

  if (authMode === "none")
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#202124] transition-colors duration-300 font-sans">
        {/* Nav */}
        <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-slate-900 dark:bg-zinc-50 rounded-lg flex items-center justify-center shadow-lg">
              <ShieldCheck className="h-5 w-5 text-white dark:text-zinc-950" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight leading-none text-slate-900 dark:text-white">Fi-Money</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">Vault Edition</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/login")}
              className="hidden sm:inline-flex px-4 py-2 text-xs font-bold text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => router.push("/register")}
              className="px-4 py-2 bg-slate-900 dark:bg-zinc-50 text-white dark:text-zinc-950 rounded-xl text-xs font-bold shadow-lg hover:bg-slate-800 dark:hover:bg-white transition-all"
            >
              Create Account
            </button>
          </div>
        </nav>

        {/* Hero */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="h-20 w-20 bg-slate-900 dark:bg-zinc-50 rounded-3xl flex items-center justify-center shadow-2xl mb-8">
            <ShieldCheck className="h-12 w-12 text-white dark:text-zinc-950" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-4">
            Secure Note Vault
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 max-w-md text-base leading-relaxed mb-10">
            Your encrypted command center for notes, data, and intelligence. Start recording your mission-critical information.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
            <button
              onClick={() => router.push("/register")}
              className="flex-1 px-6 py-3.5 bg-slate-900 dark:bg-zinc-50 text-white dark:text-zinc-950 rounded-2xl font-black text-sm shadow-lg hover:bg-slate-800 dark:hover:bg-white transition-all flex items-center justify-center gap-2"
            >
              <LogIn className="h-4 w-4" />
              Get Started
            </button>
            <button
              onClick={() => { enableGuest(); setAuthMode("guest"); }}
              className="flex-1 px-6 py-3.5 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 rounded-2xl font-black text-sm border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <UserPlus className="h-4 w-4" />
              Guest Access
            </button>
          </div>
          <p className="mt-6 text-xs text-slate-400 dark:text-zinc-600">
            Already have an account?{" "}
            <button onClick={() => router.push("/login")} className="text-slate-900 dark:text-zinc-200 font-bold hover:underline">
              Sign in
            </button>
          </p>
        </div>

        {/* Footer */}
        <div className="py-4 text-center">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-300 dark:text-zinc-700">
            Fi-Money Protocol | Vault Edition v1.0
          </p>
        </div>
      </div>
    );

  const activeNoteColor = resolveHex(currentNote.color, isDarkMode);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#202124]">
      <div className="p-6 text-slate-900 dark:text-white">
        <div className="flex items-center justify-between lg:justify-start lg:space-x-3 cursor-default">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-slate-900 dark:bg-zinc-50 rounded-lg flex items-center justify-center shadow-lg">
              <ShieldCheck className="h-5 w-5 text-white dark:text-zinc-950" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight leading-none">Fi-Money</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mt-0.5">Vault Edition</span>
            </div>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-slate-900 dark:hover:text-zinc-100">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <nav className="flex-grow px-3 space-y-0.5 overflow-y-auto custom-scrollbar">
        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 dark:text-zinc-600 uppercase tracking-widest">Navigation</div>
        <button
          onClick={() => { setActiveFilter({ type: "all" }); setIsMobileMenuOpen(false); }}
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
              onClick={() => { setActiveFilter({ type: "label", id: l.id }); setIsMobileMenuOpen(false); }}
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
        <button onClick={() => { setLabelInput(""); setLabelMgrState({ isOpen: true, mode: "create" }); }} className="w-full text-left px-3 py-1.5 rounded-lg text-[10px] text-slate-400 dark:text-zinc-600 hover:text-slate-900 dark:hover:text-zinc-200 flex items-center mt-2 group text-slate-900 dark:text-white">
          <Plus className="h-3 w-3 mr-3" />
          <span className="font-bold uppercase">New Category</span>
        </button>
      </nav>

      <div className="p-4 mt-auto border-t border-slate-200 dark:border-zinc-800 space-y-1">
        <button onClick={toggleTheme} className="w-full text-left px-3 py-2 rounded-xl flex items-center text-slate-600 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-zinc-900/50 transition-all text-slate-900 dark:text-white">
          {isDarkMode ? <Sun className="h-4 w-4 mr-3" /> : <Moon className="h-4 w-4 mr-3" />}
          <span className="text-xs font-bold">{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
        </button>
        <button onClick={() => { setActiveFilter({ type: "trash" }); setIsMobileMenuOpen(false); }} className={`w-full text-left px-3 py-2 rounded-xl flex items-center transition-all ${activeFilter.type === "trash" ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 font-bold" : "text-slate-500 dark:text-zinc-400"}`}>
          <Trash2 className="h-4 w-4 mr-3" />
          <span className="text-xs font-bold">Archive</span>
        </button>
        <button onClick={handleLogout} className="w-full flex items-center text-slate-400 dark:text-zinc-600 hover:text-slate-900 dark:hover:text-zinc-200 px-3 py-2 transition-all">
          <LogOut className="h-4 w-4 mr-3" />
          <span className="text-xs font-bold">Log Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${isDarkMode ? "dark" : ""} flex font-sans selection:bg-slate-900 selection:text-white dark:selection:bg-white dark:selection:text-slate-900 transition-colors duration-300`}>
      <div className="flex w-full bg-slate-50 dark:bg-[#202124] transition-colors duration-300">
        
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-64 border-r border-slate-200 dark:border-zinc-800 flex-col bg-slate-50 dark:bg-[#202124] shrink-0">
          <SidebarContent />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
            <aside className="fixed left-0 top-0 bottom-0 w-72 bg-slate-50 dark:bg-[#202124] shadow-2xl flex flex-col animate-[editorExpand_0.2s_ease-out]">
              <SidebarContent />
            </aside>
          </div>
        )}

        {/* Main */}
        <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <header className="p-4 md:p-6 pb-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
            <div className="flex items-center justify-between w-full md:w-auto">
              <div className="min-w-0">
                <h1 className="text-lg md:text-xl font-black tracking-tight truncate capitalize text-slate-900 dark:text-zinc-50">
                  {activeFilter.type === "all" ? "Master Ledger" : activeFilter.type === "trash" ? "Archive" : labels.find((l) => l.id === activeFilter.id)?.name || "Filtered"}
                </h1>
                <p className="text-slate-400 dark:text-zinc-500 text-[9px] font-black uppercase tracking-widest">{notes.length} Total Nodes</p>
              </div>
              <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-sm text-slate-600 dark:text-zinc-300">
                <Menu className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSearchSubmit} className="w-full md:max-w-xs relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-slate-900 dark:group-focus-within:text-zinc-100 transition-colors" />
              <input
                type="text" placeholder="Query Database..." value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); if (!e.target.value) { setCurrentPage(1); fetchNotes(""); } }}
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 dark:border-zinc-800 rounded-xl outline-none bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 text-xs font-medium focus:border-slate-900 dark:focus:border-zinc-600 transition-all shadow-sm"
              />
            </form>
          </header>

          <div className="flex-grow overflow-y-auto px-4 md:px-6 pb-24 mt-4 custom-scrollbar">
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
                    className={`group border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col h-40 relative overflow-hidden ${activeFilter.type !== "trash" ? "cursor-pointer active:scale-95 md:hover:-translate-y-0.5" : ""} ${hiddenSourceNoteId === note.id ? "opacity-0" : ""}`}
                  >
                    <div className="absolute top-0 right-0 w-12 h-12 bg-black/[0.03] dark:bg-white/[0.03] rounded-full -mr-6 -mt-6" />
                    {renderNoteCardContent(note)}
                    <div className="absolute bottom-2 right-2 flex space-x-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      {!activeFilter.type.includes("trash") && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); setActiveNoteId(note.id); setIsShareOpen(true); }} className="p-2 md:p-1 bg-white/90 dark:bg-zinc-800/90 backdrop-blur rounded shadow-md text-slate-600 dark:text-zinc-400"><Share2 className="h-3.5 w-3.5" /></button>
                          <button onClick={(e) => { e.stopPropagation(); openEditor(note, e.currentTarget.closest("[data-note-card='true']") as HTMLElement | null); }} className="p-2 md:p-1 bg-white/90 dark:bg-zinc-800/90 backdrop-blur rounded shadow-md text-slate-600 dark:text-zinc-400"><Edit2 className="h-3.5 w-3.5" /></button>
                        </>
                      )}
                      <button onClick={(e) => handleDelete(note.id, e)} className="p-2 md:p-1 bg-white/90 dark:bg-zinc-800/90 backdrop-blur rounded shadow-md text-red-500 dark:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {totalPages > 1 && (
              <div className="flex justify-center items-center mt-10 mb-8 space-x-2 bg-white dark:bg-zinc-900 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-800 max-w-fit mx-auto">
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-20 text-slate-600 dark:text-zinc-400 transition-all"><ChevronLeft className="h-4 w-4" /></button>
                <div className="px-3 font-black text-[10px] text-slate-900 dark:text-zinc-100">{currentPage} / {totalPages}</div>
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-20 text-slate-600 dark:text-zinc-400 transition-all"><ChevronRight className="h-4 w-4" /></button>
              </div>
            )}
          </div>
          
          <button onClick={() => openEditor()} className="lg:hidden fixed bottom-6 right-6 h-14 w-14 bg-slate-900 dark:bg-zinc-50 text-white dark:text-zinc-950 rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-90 transition-transform">
            <Plus className="h-6 w-6" />
          </button>
        </main>
      </div>

      {isEditorOpen && (
        <div 
          className={`fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 transition-all duration-500 ${isEditorAnimatingIn ? "bg-zinc-950/60 backdrop-blur-md" : "bg-zinc-950/0 backdrop-blur-none"}`}
          onClick={(e) => e.target === e.currentTarget && closeEditor()}
        >
          <div
            ref={editorCardRef}
            style={{
              transformOrigin: "top left",
              transform: isEditorAnimatingIn ? "translate3d(0, 0, 0) scale(1)" : (window.innerWidth < 768 ? "translate3d(0, 100%, 0)" : editorTransform),
              opacity: isEditorAnimatingIn ? 1 : (window.innerWidth < 768 ? 1 : 0),
              borderRadius: isEditorAnimatingIn ? (window.innerWidth < 768 ? "0px" : "32px") : "16px",
              backgroundColor: activeNoteColor,
              transition: `transform ${EDITOR_EXPAND_MS}ms cubic-bezier(0.16, 1, 0.3, 1), opacity ${EDITOR_EXPAND_MS * 0.6}ms ease-out, border-radius ${EDITOR_EXPAND_MS}ms cubic-bezier(0.16, 1, 0.3, 1), background-color 200ms ease`,
            }}
            className="w-full h-full md:h-auto md:max-w-2xl overflow-hidden flex flex-col max-h-screen md:max-h-[85vh] will-change-[transform,opacity,border-radius] border-none md:border md:border-white/20 dark:md:border-zinc-800 shadow-2xl"
          >
            <div className={`flex flex-col h-full min-h-0 text-slate-900 dark:text-zinc-50 transition-opacity duration-300 ${isEditorAnimatingIn ? "opacity-100" : "opacity-0"}`}>
              <div className="p-4 md:p-6 border-b border-black/5 dark:border-white/5 flex items-center">
                <button onClick={closeEditor} className="md:hidden mr-3 p-1 text-slate-400 hover:text-slate-900 dark:hover:text-zinc-100"><X className="h-5 w-5" /></button>
                <input
                  type="text" placeholder="Subject..." value={currentNote.title}
                  onChange={(e) => setCurrentNote({ ...currentNote, title: e.target.value })}
                  className="text-lg md:text-xl font-black bg-transparent outline-none w-full tracking-tight"
                />
              </div>
              {currentNote.id && (
                <div className="px-4 md:px-6 py-2 border-b border-black/5 dark:border-white/5 bg-transparent flex flex-wrap gap-2 items-center overflow-x-auto whitespace-nowrap scrollbar-none">
                  <span className="text-[9px] font-black opacity-50 uppercase tracking-widest mr-2 text-slate-500 dark:text-zinc-400">Indexing:</span>
                  {labels.map((lbl) => {
                    const hasLabel = currentNote.labels?.some((l) => l.id === lbl.id);
                    return (
                      <button key={lbl.id} onClick={() => toggleLabel(lbl.id, !!hasLabel)} className={`text-[9px] font-black px-2.5 py-1 rounded-full transition-all uppercase ${hasLabel ? "bg-slate-900 dark:bg-zinc-50 text-white dark:text-zinc-950" : "bg-black/5 dark:bg-white/10"}`}>{lbl.name}</button>
                    );
                  })}
                </div>
              )}
              <textarea
                placeholder="Secure data entry..." value={currentNote.content}
                onChange={(e) => setCurrentNote({ ...currentNote, content: e.target.value })}
                className="p-4 md:p-6 w-full flex-grow resize-none outline-none bg-transparent h-[300px] text-base font-medium leading-relaxed"
              />
              <div className="p-4 md:p-6 border-t border-black/5 dark:border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex flex-wrap justify-center gap-2">
                  {COLOR_PALETTE.map((c) => (
                    <button key={c.id} onClick={() => setCurrentNote({ ...currentNote, color: c.id })} className={`w-8 h-8 md:w-6 md:h-6 rounded-full border border-black/20 dark:border-white/20 transition-all ${currentNote.color === c.id ? "ring-2 ring-slate-900 dark:ring-zinc-50 ring-offset-1 scale-110" : ""}`} style={{ backgroundColor: isDarkMode ? c.dark : c.light }} />
                  ))}
                </div>
                <div className="flex w-full sm:w-auto space-x-3">
                  <button 
                    onClick={closeEditor} 
                    className="hidden md:block px-6 py-2.5 font-black text-[10px] uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors"
                  >
                    Discard
                  </button>
                  <button 
                    onClick={handleSaveNote} 
                    className="flex-1 sm:flex-none px-8 py-4 md:py-2.5 bg-slate-900 dark:bg-zinc-50 text-white dark:text-zinc-950 rounded-2xl md:rounded-xl font-black text-xs md:text-[10px] uppercase tracking-wider shadow-lg active:scale-95 transition-all"
                  >
                    Commit Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {labelMgrState.isOpen && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#2d2e31] rounded-[32px] shadow-2xl w-full max-w-sm p-8 border border-slate-200 dark:border-zinc-800 animate-[editorExpand_0.3s_cubic-bezier(0.16,1,0.3,1)]">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="h-12 w-12 bg-slate-900 dark:bg-zinc-50 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                <FolderOpen className="h-6 w-6 text-white dark:text-zinc-950" />
              </div>
              <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-zinc-50">
                {labelMgrState.mode === "create" ? "New Category" : "Refine Category"}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em] mt-1">
                Updating Vault Parameters
              </p>
            </div>
            
            <div className="relative group mb-6">
              <input
                autoFocus type="text" value={labelInput}
                placeholder="Category name..."
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLabelAction()}
                className="w-full p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl outline-none text-sm font-bold text-slate-900 dark:text-zinc-100 focus:border-slate-900 dark:focus:border-zinc-400 transition-all placeholder:text-slate-300 dark:placeholder:text-zinc-700"
              />
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setLabelMgrState({ isOpen: false, mode: "create" })} 
                className="flex-1 px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleLabelAction} 
                className="flex-1 px-4 py-3 bg-slate-900 dark:bg-zinc-50 text-white dark:text-zinc-950 rounded-2xl font-black text-[11px] uppercase tracking-wider shadow-lg active:scale-95 transition-all"
              >
                {labelMgrState.mode === "create" ? "Initialize" : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isShareOpen && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#2d2e31] rounded-[32px] shadow-2xl w-full max-w-sm p-8 border border-slate-200 dark:border-zinc-800 animate-[editorExpand_0.3s_cubic-bezier(0.16,1,0.3,1)]">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="h-12 w-12 bg-slate-900 dark:bg-zinc-50 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                <Share2 className="h-6 w-6 text-white dark:text-zinc-950" />
              </div>
              <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-zinc-50">
                Authorize Access
              </h3>
              <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em] mt-1">
                Peer-to-Peer Distribution
              </p>
            </div>
            
            <div className="relative group mb-6">
              <input
                type="email" placeholder="recipient@vault.net" value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleShare()}
                className="w-full p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl outline-none text-sm font-bold text-slate-900 dark:text-zinc-100 focus:border-slate-900 dark:focus:border-zinc-400 transition-all placeholder:text-slate-300 dark:placeholder:text-zinc-700"
              />
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setIsShareOpen(false)} 
                className="flex-1 px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleShare} 
                className="flex-1 px-4 py-3 bg-slate-900 dark:bg-zinc-50 text-white dark:text-zinc-950 rounded-2xl font-black text-[11px] uppercase tracking-wider shadow-lg active:scale-95 transition-all"
              >
                Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
          <div className={`px-4 py-2.5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.2)] border flex items-center gap-3 backdrop-blur-xl animate-[editorExpand_0.4s_cubic-bezier(0.16,1,0.3,1)] pointer-events-auto ${
            toast.type === "error" ? "bg-red-500/90 border-red-400/50 text-white" : 
            toast.type === "success" ? "bg-slate-900/95 dark:bg-zinc-50/95 border-slate-700/50 dark:border-zinc-200/50 text-white dark:text-zinc-950" : 
            "bg-blue-600/90 border-blue-400/50 text-white"
          }`}>
            <div className={`h-7 w-7 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
              toast.type === "error" ? "bg-red-400/30" : 
              toast.type === "success" ? "bg-white/10 dark:bg-black/10" : 
              "bg-blue-400/30"
            }`}>
              {toast.type === "error" ? <X className="h-3.5 w-3.5" /> : 
               toast.type === "success" ? <ShieldCheck className="h-3.5 w-3.5" /> : 
               <FolderOpen className="h-3.5 w-3.5" />}
            </div>
            <div className="flex flex-col pr-1">
              <span className="text-[11px] font-black tracking-tight leading-tight">
                {toast.message}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import {
  ShieldCheck,
  FolderOpen,
  Plus,
  Sun,
  Moon,
  Trash2,
  LogOut,
  Edit2,
  X,
} from "lucide-react";
import type { Label, Filter } from "@/lib/constants";

interface SidebarProps {
  labels: Label[];
  activeFilter: Filter;
  isDarkMode: boolean;
  isMobileMenuOpen: boolean;
  onFilterChange: (filter: Filter) => void;
  onToggleMobile: () => void;
  onToggleTheme: () => void;
  onLogout: () => void;
  onEditLabel: (label: Label) => void;
  onCreateLabel: () => void;
}

export function Sidebar({
  labels,
  activeFilter,
  isDarkMode,
  isMobileMenuOpen,
  onFilterChange,
  onToggleMobile,
  onToggleTheme,
  onLogout,
  onEditLabel,
  onCreateLabel,
}: SidebarProps) {
  const content = (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#202124]">
      <div className="p-6 text-slate-900 dark:text-white">
        <div className="flex items-center justify-between lg:justify-start lg:space-x-3 cursor-default">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-slate-900 dark:bg-zinc-50 rounded-lg flex items-center justify-center shadow-lg">
              <ShieldCheck className="h-5 w-5 text-white dark:text-zinc-950" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight leading-none">
                Fi-Money
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mt-0.5">
                Vault Edition
              </span>
            </div>
          </div>
          <button
            onClick={onToggleMobile}
            className="lg:hidden p-2 text-slate-400 hover:text-slate-900 dark:hover:text-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <nav className="flex-grow px-3 space-y-0.5 overflow-y-auto custom-scrollbar">
        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 dark:text-zinc-600 uppercase tracking-widest">
          Navigation
        </div>
        <button
          onClick={() => onFilterChange({ type: "all" })}
          className={`w-full text-left px-3 py-2 rounded-xl flex items-center group transition-all ${
            activeFilter.type === "all"
              ? "bg-white dark:bg-zinc-900 shadow-sm border border-slate-200 dark:border-zinc-800"
              : "text-slate-600 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-zinc-900/50"
          }`}
        >
          <FolderOpen
            className={`h-4 w-4 mr-3 transition-colors ${
              activeFilter.type === "all"
                ? "text-slate-900 dark:text-white"
                : "text-slate-400 dark:text-zinc-600"
            }`}
          />
          <span className="font-bold text-xs text-slate-900 dark:text-white">
            Records
          </span>
        </button>

        <div className="mt-6 px-3 py-2 text-[10px] font-bold text-slate-400 dark:text-zinc-600 uppercase tracking-widest">
          Categories
        </div>
        {labels.map((l) => (
          <div key={l.id} className="group relative">
            <button
              onClick={() => onFilterChange({ type: "label", id: l.id })}
              className={`w-full text-left px-3 py-1.5 rounded-lg flex items-center transition-all ${
                activeFilter.id === l.id
                  ? "bg-white dark:bg-zinc-900 shadow-sm border border-slate-200 dark:border-zinc-800 font-black"
                  : "text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-zinc-900/50"
              }`}
            >
              <div
                className={`h-1.5 w-1.5 rounded-full mr-3 ${
                  activeFilter.id === l.id
                    ? "bg-slate-900 dark:bg-zinc-50"
                    : "bg-slate-300 dark:bg-zinc-700"
                }`}
              />
              <span className="text-xs truncate flex-grow text-slate-900 dark:text-zinc-100">
                {l.name}
              </span>
              <Edit2
                onClick={(e) => {
                  e.stopPropagation();
                  onEditLabel(l);
                }}
                className="h-3 w-3 opacity-0 group-hover:opacity-100 cursor-pointer text-slate-900 dark:text-zinc-100"
              />
            </button>
          </div>
        ))}
        <button
          onClick={onCreateLabel}
          className="w-full text-left px-3 py-1.5 rounded-lg text-[10px] text-slate-400 dark:text-zinc-600 hover:text-slate-900 dark:hover:text-zinc-200 flex items-center mt-2 group text-slate-900 dark:text-white"
        >
          <Plus className="h-3 w-3 mr-3" />
          <span className="font-bold uppercase">New Category</span>
        </button>
      </nav>

      <div className="p-4 mt-auto border-t border-slate-200 dark:border-zinc-800 space-y-1">
        <button
          onClick={onToggleTheme}
          className="w-full text-left px-3 py-2 rounded-xl flex items-center text-slate-600 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-zinc-900/50 transition-all text-slate-900 dark:text-white"
        >
          {isDarkMode ? (
            <Sun className="h-4 w-4 mr-3" />
          ) : (
            <Moon className="h-4 w-4 mr-3" />
          )}
          <span className="text-xs font-bold">
            {isDarkMode ? "Light Mode" : "Dark Mode"}
          </span>
        </button>
        <button
          onClick={() => onFilterChange({ type: "trash" })}
          className={`w-full text-left px-3 py-2 rounded-xl flex items-center transition-all ${
            activeFilter.type === "trash"
              ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 font-bold"
              : "text-slate-500 dark:text-zinc-400"
          }`}
        >
          <Trash2 className="h-4 w-4 mr-3" />
          <span className="text-xs font-bold">Archive</span>
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center text-slate-400 dark:text-zinc-600 hover:text-slate-900 dark:hover:text-zinc-200 px-3 py-2 transition-all"
        >
          <LogOut className="h-4 w-4 mr-3" />
          <span className="text-xs font-bold">Log Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex w-64 border-r border-slate-200 dark:border-zinc-800 flex-col bg-slate-50 dark:bg-[#202124] shrink-0">
        {content}
      </aside>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm"
            onClick={onToggleMobile}
          />
          <aside className="fixed left-0 top-0 bottom-0 w-72 bg-slate-50 dark:bg-[#202124] shadow-2xl flex flex-col animate-[editorExpand_0.2s_ease-out]">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}

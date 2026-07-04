"use client";

import { ShieldCheck, X, FolderOpen } from "lucide-react";

export interface ToastData {
  message: string;
  type: "success" | "error" | "info";
}

interface ToastProps {
  toast: ToastData | null;
}

export function Toast({ toast }: ToastProps) {
  if (!toast) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
      <div
        className={`px-4 py-2.5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.2)] border flex items-center gap-3 backdrop-blur-xl animate-[editorExpand_0.4s_cubic-bezier(0.16,1,0.3,1)] pointer-events-auto ${
          toast.type === "error"
            ? "bg-red-500/90 border-red-400/50 text-white"
            : toast.type === "success"
              ? "bg-slate-900/95 dark:bg-zinc-50/95 border-slate-700/50 dark:border-zinc-200/50 text-white dark:text-zinc-950"
              : "bg-blue-600/90 border-blue-400/50 text-white"
        }`}
      >
        <div
          className={`h-7 w-7 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
            toast.type === "error"
              ? "bg-red-400/30"
              : toast.type === "success"
                ? "bg-white/10 dark:bg-black/10"
                : "bg-blue-400/30"
          }`}
        >
          {toast.type === "error" ? (
            <X className="h-3.5 w-3.5" />
          ) : toast.type === "success" ? (
            <ShieldCheck className="h-3.5 w-3.5" />
          ) : (
            <FolderOpen className="h-3.5 w-3.5" />
          )}
        </div>
        <div className="flex flex-col pr-1">
          <span className="text-[11px] font-black tracking-tight leading-tight">
            {toast.message}
          </span>
        </div>
      </div>
    </div>
  );
}

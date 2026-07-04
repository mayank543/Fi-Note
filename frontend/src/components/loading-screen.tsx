"use client";

import { ShieldCheck } from "lucide-react";

export function LoadingScreen() {
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
}

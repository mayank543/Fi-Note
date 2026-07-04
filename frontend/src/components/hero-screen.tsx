"use client";

import { ShieldCheck, LogIn, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";

interface HeroScreenProps {
  onGuestLogin: () => void;
}

export function HeroScreen({ onGuestLogin }: HeroScreenProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#202124] font-sans">
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
            onClick={onGuestLogin}
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

      <div className="py-4 text-center">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-300 dark:text-zinc-700">
          Fi-Money Protocol | Vault Edition v1.0
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: (email: string) => void;
}

export function ShareModal({ isOpen, onClose, onShare }: ShareModalProps) {
  const [email, setEmail] = useState("");

  const handleShare = () => {
    if (!email) return;
    onShare(email);
    setEmail("");
    onClose();
  };

  if (!isOpen) return null;

  return (
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
            type="email"
            placeholder="recipient@vault.net"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleShare()}
            className="w-full p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl outline-none text-sm font-bold text-slate-900 dark:text-zinc-100 focus:border-slate-900 dark:focus:border-zinc-400 transition-all placeholder:text-slate-300 dark:placeholder:text-zinc-700"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
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
  );
}

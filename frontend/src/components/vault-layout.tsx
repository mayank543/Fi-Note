"use client";

import type { ReactNode } from "react";

interface VaultLayoutProps {
  isDarkMode: boolean;
  sidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
}

export function VaultLayout({
  isDarkMode,
  sidebar,
  header,
  children,
}: VaultLayoutProps) {
  return (
    <div
      className={`min-h-screen ${isDarkMode ? "dark" : ""} flex font-sans selection:bg-slate-900 selection:text-white dark:selection:bg-white dark:selection:text-slate-900`}
    >
      <div className="flex w-full bg-slate-50 dark:bg-[#202124]">
        {sidebar}

        <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <div className="p-4 md:p-6 pb-2 shrink-0">{header}</div>

          <div className="flex-grow overflow-y-auto px-4 md:px-6 pb-24 mt-4 custom-scrollbar">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

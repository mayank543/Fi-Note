"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface ThemeContextValue {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDarkMode: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains("dark"));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleTheme = useCallback(() => {
    const next = !document.documentElement.classList.contains("dark");
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    setIsDarkMode(next);
  }, []);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

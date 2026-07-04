"use client";

import { useState, useEffect, useCallback } from "react";
import { isGuest, enableGuest, disableGuest } from "@/lib/guest";
import type { AuthMode } from "@/lib/constants";

export function useAuth() {
  const [authMode, setAuthMode] = useState<AuthMode>("loading");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      setAuthMode("authenticated");
    } else if (isGuest()) {
      setAuthMode("guest");
    } else {
      setAuthMode("none");
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const logout = useCallback(() => {
    if (authMode === "guest") {
      disableGuest();
      setAuthMode("none");
    } else {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
  }, [authMode]);

  const enableGuestLogin = useCallback(() => {
    enableGuest();
    setAuthMode("guest");
  }, []);

  return { authMode, setAuthMode, logout, enableGuestLogin };
}

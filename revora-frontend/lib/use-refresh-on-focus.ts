"use client";

import { useEffect } from "react";

export function useRefreshOnFocus(refresh: () => void) {
  useEffect(() => {
    function handleFocus() {
      refresh();
    }

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refresh]);
}

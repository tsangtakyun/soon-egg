"use client";

import { useEffect } from "react";

/** Only for work not yet accepted by a recoverable server-side job. */
export function usePendingPageWarning(pending: boolean) {
  useEffect(() => {
    if (!pending) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const onLink = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!link || link.getAttribute("target") === "_blank" || event.ctrlKey || event.metaKey) return;
      if (!window.confirm("內容仍在處理，離開可能中斷本次操作。確定離開？")) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onLink, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", onLink, true); };
  }, [pending]);
}

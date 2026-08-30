"use client";

import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const LOADING_WORDS = /載入|處理|儲存|提交|登入|連接|同步|生成|建立|刪除|更新|讀取|loading|saving|submitting/i;

export function GlobalInteractionFeedback() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState("正在載入…");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeElementRef = useRef<HTMLElement | null>(null);
  const mountedRef = useRef(false);

  function clearFeedback() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    activeElementRef.current?.classList.remove("soon-interaction-pending");
    activeElementRef.current = null;
    setVisible(false);
  }

  function startFeedback(nextLabel: string, element?: HTMLElement | null) {
    if (timerRef.current) clearTimeout(timerRef.current);
    activeElementRef.current?.classList.remove("soon-interaction-pending");
    activeElementRef.current = element ?? null;
    activeElementRef.current?.classList.add("soon-interaction-pending");
    setLabel(nextLabel);
    setVisible(true);
    timerRef.current = setTimeout(clearFeedback, 12_000);
  }

  function watchButton(element: HTMLElement) {
    if (timerRef.current) clearTimeout(timerRef.current);
    const startedAt = Date.now();
    const check = () => {
      const button = element as HTMLButtonElement;
      const stillBusy = button.disabled || button.getAttribute("aria-busy") === "true" || LOADING_WORDS.test(button.textContent ?? "");
      if (stillBusy && Date.now() - startedAt < 12_000) {
        timerRef.current = setTimeout(check, 180);
        return;
      }
      const remaining = Math.max(0, 650 - (Date.now() - startedAt));
      timerRef.current = setTimeout(clearFeedback, remaining);
    };
    timerRef.current = setTimeout(check, 120);
  }

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    clearFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("a, button, [role='button'], input[type='submit']") : null;
      if (!target || target.hasAttribute("disabled") || target.getAttribute("aria-disabled") === "true" || target.dataset.noLoading === "true") return;

      if (target instanceof HTMLAnchorElement) {
        if (target.target === "_blank" || target.hasAttribute("download")) return;
        const destination = new URL(target.href, window.location.href);
        if (destination.origin !== window.location.origin) return;
        const current = `${window.location.pathname}${window.location.search}`;
        if (`${destination.pathname}${destination.search}` === current || destination.hash) return;
        startFeedback("正在開啟頁面…", target);
        return;
      }

      startFeedback("正在處理…", target);
      watchButton(target);
    }

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`global-interaction-feedback ${visible ? "is-visible" : ""}`} aria-live="polite" aria-hidden={!visible}>
      <div className="global-interaction-bar" />
      <div className="global-interaction-pill"><Image className="global-interaction-egg" src="/soon-egg.png" width={26} height={26} alt="" />{label}</div>
    </div>
  );
}

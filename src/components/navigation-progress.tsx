"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const START_EVENT = "mht:navigation-start";

/** Call before a programmatic router.push() so the progress bar shows. */
export function signalNavigationStart() {
  window.dispatchEvent(new Event(START_EVENT));
}

/**
 * Thin bar at the top of the screen from the moment a link is tapped until the
 * new page is on screen, so every tap gets instant visual feedback.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = `${pathname}?${searchParams.toString()}`;
  const currentRef = useRef(current);
  // The URL we were on when navigation started. The bar shows while we are still on it.
  const [startedOn, setStartedOn] = useState<string | null>(null);
  // As soon as the URL changes (link, back or forward), the navigation is finished.
  // Without this reset, pressing Back returns to the URL the bar remembered and it
  // would wrongly show "loading" again until the safety timeout.
  const [lastUrl, setLastUrl] = useState(current);
  if (lastUrl !== current) {
    setLastUrl(current);
    setStartedOn(null);
  }
  const active = startedOn !== null && startedOn === current;

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      setStartedOn(currentRef.current);
      clearTimeout(timeout);
      // Never leave the bar stuck (e.g. navigation cancelled or failed).
      timeout = setTimeout(() => setStartedOn(null), 15000);
    };

    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.("a");
      if (!anchor || !anchor.href || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname.startsWith("/api/")) return;
      if (`${url.pathname}?${url.searchParams.toString()}` === currentRef.current) return;
      start();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener(START_EVENT, start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(START_EVENT, start);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`no-print pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] overflow-hidden transition-opacity duration-200 ${
        active ? "opacity-100" : "opacity-0"
      }`}
    >
      {active && <div className="nav-progress-bar h-full w-full rounded-full bg-sage-500" />}
    </div>
  );
}

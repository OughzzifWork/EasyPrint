"use client";

import { useEffect } from "react";

export function DevToolsBlocker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;

    // Detect DevTools via debugger timing
    const threshold = 100;
    let devtoolsOpen = false;

    const detector = () => {
      const start = performance.now();
      debugger; // eslint-disable-line no-debugger
      const end = performance.now();
      if (end - start > threshold) {
        devtoolsOpen = true;
        handleDevToolsDetected();
      }
    };

    // Detect via console profiling
    const consoleDetector = () => {
      const element = new Image();
      Object.defineProperty(element, "id", {
        get: () => {
          devtoolsOpen = true;
          handleDevToolsDetected();
        },
      });
      console.debug(element);
    };

    // Detect via window size difference (DevTools docked)
    const sizeDetector = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      if (widthThreshold || heightThreshold) {
        devtoolsOpen = true;
        handleDevToolsDetected();
      }
    };

    // Disable right-click
    const disableRightClick = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Disable common shortcuts
    const disableShortcuts = (e: KeyboardEvent) => {
      // F12
      if (e.key === "F12") {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C
      if (e.ctrlKey && e.shiftKey && ["I", "J", "C", "K"].includes(e.key.toUpperCase())) {
        e.preventDefault();
        return false;
      }
      // Ctrl+U (view source)
      if (e.ctrlKey && e.key.toUpperCase() === "U") {
        e.preventDefault();
        return false;
      }
      // Ctrl+S (save)
      if (e.ctrlKey && e.key.toUpperCase() === "S") {
        e.preventDefault();
        return false;
      }
    };

    const handleDevToolsDetected = () => {
      document.body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#FAFBFF;font-family:'DM Sans',sans-serif;">
          <div style="text-align:center;padding:40px;max-width:400px;">
            <div style="width:64px;height:64px;border-radius:16px;background:#FEE2E2;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <h1 style="font-size:20px;font-weight:700;color:#1E293B;margin:0 0 8px;">Accès restreint</h1>
            <p style="font-size:14px;color:#94A3B8;margin:0;">Les outils de développement ne sont pas autorisés sur cette application.</p>
          </div>
        </div>
      `;
      document.body.style.overflow = "hidden";
    };

    document.addEventListener("contextmenu", disableRightClick);
    document.addEventListener("keydown", disableShortcuts);

    const intervals: ReturnType<typeof setInterval>[] = [];
    intervals.push(setInterval(detector, 2000));
    intervals.push(setInterval(consoleDetector, 3000));
    intervals.push(setInterval(sizeDetector, 1000));

    return () => {
      document.removeEventListener("contextmenu", disableRightClick);
      document.removeEventListener("keydown", disableShortcuts);
      intervals.forEach(clearInterval);
    };
  }, []);

  return null;
}

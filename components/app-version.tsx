"use client";

import { useState } from "react";

/** Small footer reading the app's version + the deploy commit. The commit
 * hash is injected at build time via NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA so
 * support requests can be tied to the exact deploy that produced the bug.
 * Tapping it 5 times shows the display diagnostics (screen vs viewport vs
 * safe areas), for debugging how iOS lays out the installed app. */
export function AppVersion() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
  const sha = (
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    ""
  ).slice(0, 7);
  const [taps, setTaps] = useState(0);
  const [lines, setLines] = useState<string[] | null>(null);

  const onTap = () => {
    const next = taps + 1;
    setTaps(next);
    if (next >= 5) {
      setTaps(0);
      setLines((cur) => (cur ? null : readDiagnostics()));
    }
  };

  return (
    <div className="mt-6 text-center">
      <button
        type="button"
        onClick={onTap}
        className="text-[10px] font-medium tracking-wide text-[var(--glide-muted)]"
      >
        glidepay v{version}
        {sha ? ` · ${sha}` : ""}
      </button>
      {lines ? (
        <pre className="mx-auto mt-3 max-w-full overflow-x-auto whitespace-pre-wrap rounded-xl bg-black/40 p-3 text-left font-mono text-[11px] leading-relaxed text-white">
          {lines.join("\n")}
        </pre>
      ) : null}
    </div>
  );
}

function probe(css: string): number {
  const el = document.createElement("div");
  el.style.cssText = `position:fixed;left:0;top:0;width:0;visibility:hidden;pointer-events:none;${css}`;
  document.documentElement.appendChild(el);
  const h = el.getBoundingClientRect().height;
  el.remove();
  return Math.round(h);
}

function readDiagnostics(): string[] {
  const d = document.documentElement;
  const shell = document.querySelector(".app-shell-root")?.getBoundingClientRect();
  const nav = document.querySelector("nav.rounded-t-\\[26px\\]")?.getBoundingClientRect();
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true;
  return [
    `standalone: ${standalone}`,
    `screen: ${screen.width}x${screen.height}  dpr: ${window.devicePixelRatio}`,
    `inner: ${window.innerWidth}x${window.innerHeight}  client: ${d.clientHeight}`,
    `visual: ${Math.round(window.visualViewport?.height ?? 0)}  100vh: ${probe("height:100vh")}  100dvh: ${probe("height:100dvh")}  100lvh: ${probe("height:100lvh")}`,
    `inset top: ${probe("height:env(safe-area-inset-top,0px)")}  bottom: ${probe("height:env(safe-area-inset-bottom,0px)")}`,
    `theme-color: ${document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content ?? "-"}`,
    `shell: top ${Math.round(shell?.top ?? -1)} bottom ${Math.round(shell?.bottom ?? -1)}`,
    `nav: top ${Math.round(nav?.top ?? -1)} bottom ${Math.round(nav?.bottom ?? -1)}`,
  ];
}

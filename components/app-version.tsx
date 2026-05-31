/** Small footer reading the app's version + the deploy commit. The commit
 * hash is injected at build time via NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA so
 * support requests can be tied to the exact deploy that produced the bug. */
export function AppVersion() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
  const sha = (
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    ""
  ).slice(0, 7);

  return (
    <p className="mt-6 text-center text-[10px] font-medium tracking-wide text-[var(--glide-muted)]">
      glidepay v{version}
      {sha ? ` · ${sha}` : ""}
    </p>
  );
}

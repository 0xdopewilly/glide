/** Passthrough layout — no remount key, no enter animation (Next.js already swaps routes). */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-motion-panel flex min-h-0 flex-1 flex-col overflow-hidden">
      {children}
    </div>
  );
}

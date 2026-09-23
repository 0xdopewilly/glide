"use client";

import { GlideAssistantChat } from "@/components/glide-assistant-chat";
import { Suspense } from "react";

// Imported directly (not next/dynamic) so the chat ships in this route's
// chunk, which the bottom nav prefetches — the tab opens instantly instead
// of blank while a separate chunk downloads. The (app) tree only renders on
// the client behind AuthGate, so there's no SSR concern. Suspense covers the
// chat's useSearchParams.
export default function AskPage() {
  return (
    <Suspense fallback={null}>
      <GlideAssistantChat variant="page" />
    </Suspense>
  );
}

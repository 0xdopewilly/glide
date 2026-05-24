"use client";

import dynamic from "next/dynamic";

const GlideAssistantChat = dynamic(
  () =>
    import("@/components/glide-assistant-chat").then(
      (m) => m.GlideAssistantChat,
    ),
  { ssr: false, loading: () => null },
);

export default function AskPage() {
  return <GlideAssistantChat variant="page" />;
}

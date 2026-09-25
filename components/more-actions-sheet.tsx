"use client";

import { BottomSheet } from "@/components/bottom-sheet";
import { SettingsRow } from "@/components/settings-list";
import { HOME_MORE_ACTIONS } from "@/lib/payment-actions";

/** Home's "More" actions. Every action leaves Home, which unmounts the sheet. */
export function MoreActionsSheet({ onClose }: { onClose: () => void }) {
  return (
    <BottomSheet title="More" onClose={onClose}>
      {HOME_MORE_ACTIONS.map((a) => (
        <SettingsRow
          key={a.id}
          icon={a.icon}
          title={a.title}
          subtitle={a.subtitle}
          href={a.href}
        />
      ))}
    </BottomSheet>
  );
}

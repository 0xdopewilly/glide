"use client";

import { ActivityFeed } from "@/components/activity-feed";
import { ActivityToolbar } from "@/components/activity-toolbar";
import { PageHeader } from "@/components/page-header";
import {
  filterByKind,
  filterByPeriod,
  groupTransactionsByDate,
  type ActivityKindFilter,
  type ActivityPeriod,
} from "@/lib/activity";
import { useWallet } from "@/context/wallet-context";
import { useMemo, useState } from "react";

export default function ActivityPage() {
  const { transactions, transactionsLoading, refresh, refreshing } = useWallet();
  const [kind, setKind] = useState<ActivityKindFilter>("all");
  const [period, setPeriod] = useState<ActivityPeriod>("all");

  const filtered = useMemo(() => {
    let list = transactions;
    list = filterByKind(list, kind);
    list = filterByPeriod(list, period);
    return list;
  }, [transactions, kind, period]);

  const groups = useMemo(
    () => groupTransactionsByDate(filtered),
    [filtered],
  );

  return (
    <>
      <PageHeader title="Activity" />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-6">
        <ActivityToolbar
          kind={kind}
          period={period}
          count={filtered.length}
          onKindChange={setKind}
          onPeriodChange={setPeriod}
          onRefresh={() => void refresh()}
          refreshing={refreshing}
        />
        <ActivityFeed
          groups={groups}
          loading={transactionsLoading}
          emptyMessage={
            transactions.length === 0
              ? "Your activity will show up here"
              : "Nothing in this date range or type"
          }
        />
      </div>
    </>
  );
}

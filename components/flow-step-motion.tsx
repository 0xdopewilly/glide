/** Step swap — instant (no animation; avoids stacked remount + enter jank). */
export function FlowStepMotion({
  children,
}: {
  stepKey: string;
  children: React.ReactNode;
  direction?: number;
}) {
  return <div className="flex min-h-0 flex-1 flex-col">{children}</div>;
}

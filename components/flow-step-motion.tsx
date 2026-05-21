"use client";

/** Step change inside a flow — CSS enter only, no exit animation. */
export function FlowStepMotion({
  stepKey,
  children,
}: {
  stepKey: string;
  children: React.ReactNode;
  direction?: number;
}) {
  return (
    <div key={stepKey} className="glide-enter flex min-h-0 flex-1 flex-col">
      {children}
    </div>
  );
}

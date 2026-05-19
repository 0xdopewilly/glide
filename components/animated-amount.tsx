"use client";

/** Balance display — tabular nums only; no layout-shifting spring animations. */
export function AnimatedAmount({
  value,
  prefix = "$",
  className = "",
}: {
  value: string;
  prefix?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-baseline tabular-nums ${className}`}>
      {prefix ? <span className="mr-1 opacity-80">{prefix}</span> : null}
      <span key={value} className="inline-block transition-opacity duration-150">
        {value}
      </span>
    </span>
  );
}

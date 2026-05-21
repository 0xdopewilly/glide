/** Amount display — static (no digit animation; avoids layout thrash). */
export function AnimatedAmount({
  value,
  prefix,
  className = "",
  prefixClassName = "mr-0.5 text-[0.58em] font-bold opacity-50",
  amountClassName = "",
}: {
  value: string;
  prefix?: string;
  className?: string;
  prefixClassName?: string;
  amountClassName?: string;
}) {
  return (
    <span
      className={`inline-flex items-baseline justify-center tabular-nums ${className}`}
    >
      {prefix ? (
        <span className={`shrink-0 ${prefixClassName}`}>{prefix}</span>
      ) : null}
      <span className={`inline-block ${amountClassName}`}>{value}</span>
    </span>
  );
}

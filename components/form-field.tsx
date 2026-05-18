export const inputClassName =
  "w-full rounded-xl border px-4 py-3.5 text-[15px] font-normal tracking-tight focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--glide-accent)_35%,transparent)] glide-input";

export const labelClassName =
  "mb-2 block text-xs font-medium uppercase tracking-[0.1em] glide-muted";

export function FormField({
  id,
  label,
  children,
  className = "",
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      {children}
    </div>
  );
}

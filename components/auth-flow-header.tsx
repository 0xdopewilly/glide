import { GlideLogo } from "@/components/glide-logo";
import { headerIconButtonClassName } from "@/components/header-icon-button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export function AuthFlowHeader({ backHref = "/onboarding" }: { backHref?: string }) {
  return (
    <header className="relative z-10 flex shrink-0 items-center px-5 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <Link
        href={backHref}
        className={headerIconButtonClassName()}
        aria-label="Back to onboarding"
      >
        <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
      </Link>

      <div className="pointer-events-none absolute inset-x-0 flex justify-center">
        <div className="inline-flex items-center gap-2.5">
          <GlideLogo size="sm" linked={false} glow={false} />
          <span className="text-[17px] font-bold tracking-[-0.03em]">Glide</span>
        </div>
      </div>
    </header>
  );
}

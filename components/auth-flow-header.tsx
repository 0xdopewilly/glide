import { headerIconButtonClassName } from "@/components/header-icon-button";
import { ChevronLeft } from "lucide-react";
import Image from "next/image";
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
        <Image
          src="/glidepay-logo.png"
          alt="glidepay"
          width={40}
          height={40}
          priority
          className="h-10 w-10 rounded-xl"
        />
      </div>
    </header>
  );
}

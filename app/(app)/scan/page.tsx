import { redirect } from "next/navigation";

/** Scan lives on the Send flow — keep old links working. */
export default function ScanPage() {
  redirect("/send?scan=1");
}

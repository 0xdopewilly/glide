/** Tab order for horizontal slide direction (left / right). */
export function getNavIndex(pathname: string): number {
  if (pathname === "/") return 0;
  if (pathname.startsWith("/payments") || pathname.startsWith("/scheduled") || pathname.startsWith("/request")) return 1;
  if (pathname.startsWith("/ask")) return 2;
  if (pathname.startsWith("/trade") || pathname.startsWith("/swap") || pathname.startsWith("/bridge")) return 3;
  if (pathname.startsWith("/activity")) return 4;
  if (pathname.startsWith("/profile")) return 5;
  if (
    pathname.startsWith("/send") ||
    pathname.startsWith("/receive")
  ) {
    return 6;
  }
  return 0;
}

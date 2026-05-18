/** Tab order for horizontal slide direction (left / right). */
export function getNavIndex(pathname: string): number {
  if (pathname === "/") return 0;
  if (pathname.startsWith("/activity")) return 1;
  if (pathname.startsWith("/profile")) return 2;
  if (
    pathname.startsWith("/send") ||
    pathname.startsWith("/receive") ||
    pathname.startsWith("/swap") ||
    pathname.startsWith("/bridge")
  ) {
    return 3;
  }
  return 0;
}

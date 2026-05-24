/** Copy text to clipboard with a legacy fallback for non-secure contexts (HTTP).
 *  Returns true on success, false on failure.
 *
 *  The Clipboard API (`navigator.clipboard.writeText`) requires a secure context
 *  (HTTPS or localhost). On HTTP/LAN-IP dev, it silently rejects. The
 *  `document.execCommand("copy")` path works in insecure contexts and on older
 *  Android Chrome — slightly hacky but reliable. */
export async function copyText(value: string): Promise<boolean> {
  if (!value) return false;
  if (typeof window === "undefined") return false;

  // Modern API
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      /* fall through */
    }
  }

  // Legacy execCommand fallback — works on HTTP and older Chrome.
  try {
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.opacity = "0";
    ta.style.pointerEvents = "none";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

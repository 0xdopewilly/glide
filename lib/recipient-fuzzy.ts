import { listContacts } from "@/lib/contacts-db";
import { prisma } from "@/lib/db";

/** Cheap edit-distance ratio (Levenshtein-style) for short strings. */
function similarity(a: string, b: string): number {
  const s = a.toLowerCase();
  const t = b.toLowerCase();
  if (s === t) return 1;
  if (!s.length || !t.length) return 0;
  const m = s.length;
  const n = t.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  const dist = dp[m][n];
  return 1 - dist / Math.max(m, n);
}

/** Returns up to 3 best fuzzy matches against the sender's contacts and the
 * broader Glide username pool, ranked by similarity. Used to power
 * "Did you mean @khadee?" suggestions when a recipient doesn't resolve. */
export async function fuzzySuggestRecipients(
  senderUserId: string,
  query: string,
  limit = 3,
): Promise<{ label: string; kind: "contact" | "username" }[]> {
  const q = query.trim().replace(/^@/, "");
  if (!q || q.length < 2) return [];

  const [contacts, candidates] = await Promise.all([
    listContacts(senderUserId),
    prisma.user.findMany({
      where: {
        username: { not: null, startsWith: q.slice(0, 1), mode: "insensitive" },
      },
      take: 60,
      select: { username: true },
    }),
  ]);

  const scored: { label: string; kind: "contact" | "username"; score: number }[] =
    [];

  for (const c of contacts) {
    scored.push({
      label: c.name,
      kind: "contact",
      score: similarity(c.name, q),
    });
  }
  for (const u of candidates) {
    if (!u.username) continue;
    scored.push({
      label: u.username,
      kind: "username",
      score: similarity(u.username, q),
    });
  }

  return scored
    .filter((s) => s.score >= 0.55)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ label, kind }) => ({ label, kind }));
}

/** glidepay's line-art illustrations: a cheerful character on a yellow
 * ellipse, holding something up — our own drawings in the style of the
 * reference (black outlines, white fills, one yellow accent). Inline SVG:
 * no image requests, crisp at any size, and they read on violet or white. */

const INK = "#15122B";
const PAPER = "#FFFFFF";
const SUN = "#FFD91A";

type Prop = "card" | "paper";

// Where each prop's (rotated) bottom edge is, so the hands grip it.
const HANDS: Record<Prop, { l: [number, number]; r: [number, number] }> = {
  card: { l: [85, 104], r: [158, 92] },
  paper: { l: [85, 92], r: [158, 85] },
};

function Character({ prop, uid }: { prop: Prop; uid: string }) {
  const clipId = `glide-ill-clip-${uid}`;
  const hands = HANDS[prop];
  const leftArm = `M96 166 C 90 140, 84 122, ${hands.l[0]} ${hands.l[1]}`;
  const rightArm = `M144 166 C 150 140, 156 118, ${hands.r[0]} ${hands.r[1]}`;
  return (
    <>
      <defs>
        {/* The figure rises out of the ellipse: visible above its middle,
            and inside it below. */}
        <clipPath id={clipId}>
          <rect x="0" y="0" width="240" height="150" />
          <ellipse cx="120" cy="150" rx="98" ry="60" />
        </clipPath>
      </defs>
      <ellipse cx="120" cy="150" rx="98" ry="60" fill={SUN} />
      <g clipPath={`url(#${clipId})`} strokeLinecap="round" strokeLinejoin="round">
        {/* torso */}
        <path
          d="M58 232 C 58 178, 88 156, 120 156 C 152 156, 182 178, 182 232 Z"
          fill={PAPER}
          stroke={INK}
          strokeWidth="3"
        />
        <path d="M108 162 L120 176 L132 162" fill="none" stroke={INK} strokeWidth="2.5" />
        {/* raised arms: ink outline under a white stroke */}
        <path d={leftArm} fill="none" stroke={INK} strokeWidth="22" />
        <path d={leftArm} fill="none" stroke={PAPER} strokeWidth="16" />
        <path d={rightArm} fill="none" stroke={INK} strokeWidth="22" />
        <path d={rightArm} fill="none" stroke={PAPER} strokeWidth="16" />
        {/* neck + head */}
        <path d="M112 146 L112 158 L128 158 L128 146" fill={PAPER} stroke={INK} strokeWidth="3" />
        <circle cx="120" cy="124" r="25" fill={PAPER} stroke={INK} strokeWidth="3" />
        {/* hair: a bob with a little bun */}
        <path
          d="M95 122 C 94 100, 108 92, 122 92 C 138 92, 147 102, 146 116 C 136 108, 118 104, 104 112 C 101 116, 99 120, 95 122 Z"
          fill={INK}
        />
        <circle cx="94" cy="108" r="8" fill={INK} />
        {/* face */}
        <circle cx="129" cy="122" r="2.4" fill={INK} />
        <path d="M122 132 C 125 139, 134 139, 137 131 Z" fill={INK} />
        <path d="M110 120 C 112 118, 115 118, 117 120" fill="none" stroke={INK} strokeWidth="2" />
      </g>
      {/* what they hold up (drawn over the arms, not clipped) */}
      {prop === "card" ? (
        <g transform="rotate(-9 120 52)" strokeLinejoin="round">
          <rect x="56" y="18" width="128" height="80" rx="12" fill={PAPER} stroke={INK} strokeWidth="3" />
          <rect x="72" y="40" width="22" height="17" rx="4" fill={SUN} stroke={INK} strokeWidth="2.5" />
          <path d="M80 44 L80 53 M86 44 L86 53" stroke={INK} strokeWidth="1.6" />
          <path d="M104 72 L164 72 M104 82 L140 82" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        </g>
      ) : (
        <g transform="rotate(-6 120 50)" strokeLinejoin="round">
          <rect x="52" y="14" width="136" height="74" rx="8" fill={PAPER} stroke={INK} strokeWidth="3" />
          <path d="M70 36 L146 36 M70 50 L170 50 M70 64 L128 64" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
      {/* hands gripping the prop's bottom edge */}
      <circle cx={hands.l[0]} cy={hands.l[1]} r="9" fill={PAPER} stroke={INK} strokeWidth="3" />
      <circle cx={hands.r[0]} cy={hands.r[1]} r="9" fill={PAPER} stroke={INK} strokeWidth="3" />
    </>
  );
}

/** Someone proudly holding up a card: sending / paying / success. */
export function CardHeroArt({ className = "", title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 240 212" className={className} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <Character prop="card" uid="card" />
    </svg>
  );
}

/** Someone holding up a note: requests, lists, and empty states. */
export function PaperHeroArt({ className = "", title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 240 212" className={className} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <Character prop="paper" uid="paper" />
    </svg>
  );
}

/** A little stack of banknotes and coins, for money received in a thread. */
export function MoneyStackArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 96" className={className} aria-hidden>
      <g strokeLinejoin="round" strokeWidth="2.5" stroke={INK}>
        <rect x="26" y="40" width="96" height="40" rx="6" fill="#39D98A" transform="rotate(-6 74 60)" />
        <rect x="32" y="30" width="96" height="40" rx="6" fill="#5BE3A0" transform="rotate(4 80 50)" />
        <circle cx="80" cy="50" r="11" fill="#2BBF78" transform="rotate(4 80 50)" />
        <rect x="70" y="24" width="12" height="52" fill={SUN} transform="rotate(4 80 50)" />
        <circle cx="128" cy="30" r="12" fill={SUN} />
        <circle cx="140" cy="62" r="10" fill={SUN} />
        <circle cx="18" cy="36" r="9" fill={SUN} />
      </g>
      <g fill={INK} fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="12" textAnchor="middle">
        <text x="128" y="34">$</text>
        <text x="140" y="66" fontSize="10">$</text>
        <text x="18" y="40" fontSize="9">$</text>
      </g>
    </svg>
  );
}

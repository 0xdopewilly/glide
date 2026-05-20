/** Material You–style motion tokens (shared across nav + page transitions). */

/** Standard easing — fast out, no bounce. */
export const GLIDE_EASE = [0.2, 0, 0, 1] as const;

/** Tab slide duration (seconds). */
export const GLIDE_DURATION = 0.22;

/** Press feedback on nav + tappable controls. */
export const GLIDE_TAP_SPRING = {
  type: "spring" as const,
  stiffness: 520,
  damping: 30,
  mass: 0.55,
};

/** Sliding nav indicator pill. */
export const GLIDE_LAYOUT_SPRING = {
  type: "spring" as const,
  stiffness: 400,
  damping: 32,
  mass: 0.5,
};

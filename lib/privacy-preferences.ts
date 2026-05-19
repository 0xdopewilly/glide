export type PrivacyPreferences = {
  hideBalance: boolean;
  blurAmounts: boolean;
};

const KEY = "glide.privacy";

const DEFAULTS: PrivacyPreferences = {
  hideBalance: false,
  blurAmounts: false,
};

export function readPrivacyPreferences(): PrivacyPreferences {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<PrivacyPreferences>;
    return {
      hideBalance: Boolean(parsed.hideBalance),
      blurAmounts: Boolean(parsed.blurAmounts),
    };
  } catch {
    return DEFAULTS;
  }
}

export function writePrivacyPreferences(prefs: PrivacyPreferences) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(prefs));
}

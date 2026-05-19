"use client";

import {
  readPrivacyPreferences,
  writePrivacyPreferences,
  type PrivacyPreferences,
} from "@/lib/privacy-preferences";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type PrivacyContextValue = PrivacyPreferences & {
  setHideBalance: (v: boolean) => void;
  setBlurAmounts: (v: boolean) => void;
};

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<PrivacyPreferences>(DEFAULT_FALLBACK);

  useEffect(() => {
    setPrefs(readPrivacyPreferences());
  }, []);

  const persist = useCallback((next: PrivacyPreferences) => {
    setPrefs(next);
    writePrivacyPreferences(next);
  }, []);

  const value = useMemo<PrivacyContextValue>(
    () => ({
      ...prefs,
      setHideBalance: (hideBalance) => persist({ ...prefs, hideBalance }),
      setBlurAmounts: (blurAmounts) => persist({ ...prefs, blurAmounts }),
    }),
    [prefs, persist],
  );

  return (
    <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>
  );
}

const DEFAULT_FALLBACK: PrivacyPreferences = {
  hideBalance: false,
  blurAmounts: false,
};

export function usePrivacy() {
  const ctx = useContext(PrivacyContext);
  if (!ctx) return { ...DEFAULT_FALLBACK, setHideBalance: () => {}, setBlurAmounts: () => {} };
  return ctx;
}

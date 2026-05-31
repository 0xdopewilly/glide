# Store-Readiness Checklist

Pre-flight before wrapping glidepay in Capacitor and submitting to the App Store and Play Store. Tick boxes as you go. Critical items must be done; nice-to-haves can ship later.

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done.

---

## 1. PWA fundamentals

- [x] `/public/manifest.json` exists with name, theme color, icons, shortcuts
- [x] `<link rel="manifest" href="/manifest.json">` (via Next metadata)
- [x] Apple touch icons declared
- [x] `theme-color` set per dark / light mode in viewport
- [x] `appleWebApp: { capable: true }` set
- [ ] Maskable icon at 512×512 with logo inside safe-zone circle (test at maskable.app)
- [ ] Static splash images for iOS (or rely on theme/background color)
- [ ] `robots.txt` allows crawlers
- [ ] Open Graph tags for share previews

## 2. Performance

- [ ] Lighthouse Mobile score ≥ 90 for `/`
- [ ] First Contentful Paint < 1.8s on simulated 3G
- [ ] First Load JS for `/` under 200KB
- [x] Solid-color theme (Arcium-style) — no glass / gradient layers
- [ ] No Cumulative Layout Shift (verify Performance Insights)
- [ ] Service worker registers and shows offline page on disconnect

## 3. Mobile UX

- [x] Touch targets ≥ 44px (glide-tap)
- [x] Safe-area insets used (env(safe-area-inset-*))
- [x] No viewport zoom (maximumScale = 1)
- [ ] Pull-to-refresh on home + activity
- [ ] Keyboard handling on `/send` keeps amount visible
- [ ] No hover-only affordances
- [ ] Tested on iPhone Safari, Android Chrome, iPad

## 4. Auth & deep links (Capacitor handoff)

- [ ] `.well-known/apple-app-site-association` served from root domain
- [ ] `.well-known/assetlinks.json` served from root domain
- [ ] OAuth flow tested in iOS Safari Custom Tab
- [ ] Deep link `/pay/:code` opens directly into the pay flow
- [x] Email magic link flow (Clerk default) works

## 5. Push notifications

- [x] Web push via VAPID working
- [ ] Permission prompt deferred until after first receive (not on first launch)
- [ ] `sendNotificationToUser(userId, payload)` abstraction extracted
- [ ] APNs cert obtained (will hook into Capacitor later)
- [ ] FCM project created (will hook into Capacitor later)

## 6. Legal & store-required pages

- [x] Privacy Policy at `/privacy`
- [x] Terms of Service at `/terms`
- [x] Support page at `/support` with contact emails
- [x] Account deletion: Profile → Delete account → confirmation → server-side hard delete + Clerk delete (Apple requirement)
- [ ] All three pages reachable when signed out (public routes)
- [ ] App Store Privacy Nutrition answers prepared (User ID, Email)
- [ ] Google Play Data Safety form answers prepared

## 7. Crypto-specific (Apple 3.1.5 prep)

- [x] App description: "Send and receive stablecoins on Arc. Cash App for USDC, EURC, cirBTC."
- [ ] "Testnet" badge visible in app (header or settings)
- [x] No in-app fiat onramp; no credit card forms inside the app
- [x] No mining, no derivatives, no leverage
- [ ] Reviewer demo account: `apple-review@glidepay.app` pre-funded with ~$100 testnet USDC + 2 saved contacts

## 8. Observability

- [ ] Sentry (or equivalent) wired up to capture runtime exceptions
- [ ] App version + build number visible in Profile (e.g. `0.1.0 (build 42)`)
- [ ] Vercel function timeouts audited — nothing user-facing > 10s
- [ ] Push notification delivery success rate measured

## 9. Real-device test matrix

- [ ] iPhone — latest iOS Safari, PWA install works
- [ ] iPhone — oldest supported iOS (e.g. iOS 16) Safari
- [ ] Android Chrome — latest, install works
- [ ] Android Chrome — older / slower device
- [ ] iPad Safari — at least doesn't look broken

---

## Ready-to-wrap acceptance criteria

You're ready to start Capacitor when **all of these** are true:

1. ✅ Lighthouse Mobile ≥ 90 for `/`
2. ✅ Full PWA install on iPhone & Android Chrome works (Add to Home Screen → usable standalone)
3. ✅ Privacy / Terms / Support exist and are linked from Profile
4. ✅ Account deletion flow exists and works end-to-end
5. ✅ Permission prompt for push is gated behind a real receive event
6. ✅ Apple review demo account ready
7. ✅ Web push delivers to at least 3 test users on production

---

## Capacitor wrap — order of operations (when ready)

1. Install: `npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android`
2. `npx cap init glidepay com.glidepay.app`
3. Point `capacitor.config.ts` `server.url` at `https://glide-arc.vercel.app` (keep all server routes + Clerk + Circle working as-is)
4. `npx cap add ios && npx cap add android`
5. Drop in splash screen + adaptive icon (Capacitor docs)
6. Install `@capacitor/push-notifications`; replace web push wiring for native APNs/FCM
7. Add Universal Links + App Links (`.well-known/*` files served from `/public`)
8. Set up Apple Developer cert, App Store Connect listing
9. Set up Google Play Console listing
10. Submit, wait, iterate on review feedback

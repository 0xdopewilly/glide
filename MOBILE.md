# Glidepay Mobile (iOS + Android)

The native shell that wraps the live PWA so glidepay can ship to the App Store and Play Store. Powered by [Capacitor](https://capacitorjs.com).

---

## How it works

The native app is a thin WebView wrapper. It loads `https://glide-arc.vercel.app` on launch and uses Capacitor plugins to bridge native capabilities (push notifications, status bar, haptics, biometrics, share sheet) into the same React code that runs in the browser.

**Why a remote URL instead of a static bundle:**
- Every Vercel deploy ships to the wrapped app instantly. No store review for non-native code changes.
- All server routes (Clerk auth, Circle wallets, `/api/agent`, webhooks) keep working unchanged.
- One source of truth: web users and mobile users see the same app.

**Trade-offs:**
- Requires network to launch (acceptable for a payments app).
- Apple may ask why your app is "essentially a browser" during review — answer: it adds native features (push, biometrics, deep links, share, offline status) that a PWA can't do on iOS.

---

## Local setup (one-time, on a Mac)

You need:

- **Xcode 15+** — `xcode-select --install` and download Xcode from the Mac App Store
- **Android Studio** — [download here](https://developer.android.com/studio). After install, open Tools → Device Manager → create an Android emulator.
- **CocoaPods** — `sudo gem install cocoapods` (iOS only)
- **Apple Developer Program account** — $99/year, [sign up](https://developer.apple.com/programs/) (needed to submit to App Store)
- **Google Play Console account** — $25 one-time, [sign up](https://play.google.com/console/) (needed to submit to Play Store)

After cloning the repo:

```bash
npm install
npx cap sync         # copy node_modules native bits into ios/ and android/
```

---

## Daily workflow

### Run on iOS Simulator

```bash
npm run cap:ios      # opens Xcode
```

Then in Xcode: **▶︎ Run** (Cmd+R). Pick a simulator like iPhone 15 Pro.

### Run on Android Emulator

```bash
npm run cap:android  # opens Android Studio
```

In Android Studio: wait for Gradle sync to finish, then **▶︎ Run**. Pick your emulator.

### After a web-side change

Once the change deploys to Vercel, the wrapped app picks it up on next launch — no rebuild needed. **You only rebuild the native shell when you touch Capacitor plugins, native code, splash, or icons.**

### After a Capacitor config change

```bash
npm run cap:sync     # copies capacitor.config.ts + plugin updates into ios/ + android/
```

---

## Splash screen + icons

Capacitor generates these from a single source image. Recommended workflow:

```bash
npm install -D @capacitor/assets
mkdir -p assets
# Drop a 1024×1024 icon.png and a 2732×2732 splash.png into assets/
npx @capacitor/assets generate
```

The icons + splash will be regenerated for every device size + density.

---

## Push notifications (APNs + FCM)

The web app already uses Web Push (VAPID). The native app needs separate push setup:

### iOS — Apple Push Notification service

1. In Apple Developer Console, create an **APNs Authentication Key** (`.p8` file)
2. Upload it to whichever push provider you use (Firebase, OneSignal, Knock, etc.)
3. In Xcode: target → Signing & Capabilities → +Capability → Push Notifications
4. Test in TestFlight (push doesn't work in the Simulator)

### Android — Firebase Cloud Messaging

1. Create a Firebase project, add an Android app with package name `com.glidepay.app`
2. Download `google-services.json` and drop it in `android/app/`
3. In `android/app/build.gradle`, add `apply plugin: 'com.google.gms.google-services'` at the bottom
4. In `android/build.gradle`, add the Google services plugin to buildscript deps

> The current `lib/push.ts` only supports Web Push. To deliver to native, you'll need an additional `notifyNative(userId, payload)` that sends to APNs / FCM via your chosen provider. Tracked in `STORE-READINESS.md` Section 5.

---

## Deep links (Universal Links + App Links)

So that `https://glide-arc.vercel.app/pay/abc123` opens the app directly:

### iOS

Serve `apple-app-site-association` from `https://glide-arc.vercel.app/.well-known/apple-app-site-association`:

```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["YOUR_TEAM_ID.com.glidepay.app"],
        "components": [{ "/": "/pay/*" }, { "/": "/receive" }]
      }
    ]
  }
}
```

In Xcode: target → Signing & Capabilities → +Capability → Associated Domains → add `applinks:glide-arc.vercel.app`.

### Android

Serve `assetlinks.json` from `https://glide-arc.vercel.app/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.glidepay.app",
    "sha256_cert_fingerprints": ["YOUR_RELEASE_KEYSTORE_FINGERPRINT"]
  }
}]
```

Add an `<intent-filter>` for `android:autoVerify="true"` to `MainActivity` in `AndroidManifest.xml`.

---

## Submitting

### App Store (iOS)

1. Bump `MARKETING_VERSION` in Xcode → App target → General
2. Product → Archive → Distribute App → App Store Connect
3. In [App Store Connect](https://appstoreconnect.apple.com), fill in:
   - App icon (the 1024×1024 from `assets/`)
   - Screenshots (6.5", 5.5", iPad — Apple wants real device sizes)
   - Description, keywords, support URL, privacy URL (already in `/privacy`)
   - App Privacy nutrition labels (you collect: Email, User ID, Coarse Location)
   - Demo account credentials for review (`apple-review@glidepay.app`)
4. Submit for review. First review: 3–7 days. Watch [App Review Status Center](https://developer.apple.com/contact/app-review/).

### Play Store (Android)

1. In Android Studio: Build → Generate Signed Bundle / APK → Android App Bundle
2. Sign with your release keystore (save it — losing it = locked out of updates)
3. Upload the `.aab` to [Play Console](https://play.google.com/console) → Production → Create release
4. Fill in:
   - Store listing (screenshots, description, icon — same assets as iOS)
   - Content rating (Finance category)
   - Data Safety form (matches your Privacy page)
   - Target audience (18+)
5. Submit. First review: 1–3 days.

---

## Common gotchas

- **Apple Guideline 3.1.5** — crypto wallet apps allowed but watched. Be honest in the description: "Stablecoin wallet for sending USDC, EURC, and cirBTC on Arc testnet." Don't claim mainnet or regulated services until you ship them.
- **Apple Guideline 5.1.1(v)** — account deletion is required for any app with account creation. Already implemented in Profile → Delete account.
- **Apple Guideline 4.2** — Apple may reject apps that look like a "wrapped website with no native value." Lean on push notifications, biometrics, share sheet, and deep links — anything a PWA can't do on iOS.
- **Google Play Financial Services policy** — flag yourself as a wallet in the Play Console category. Be honest about testnet status.
- **First Vercel cold start** — when an iOS user opens the app and Vercel has been idle, the first request can take ~3s. Consider showing a splash beyond Capacitor's default 1.2s — or pre-warm Vercel from the splash.

---

## What's in the repo

```
capacitor.config.ts        # Capacitor configuration
ios/                       # Xcode project (commit, don't ignore)
android/                   # Android Studio project (commit, don't ignore)
MOBILE.md                  # this file
STORE-READINESS.md         # pre-flight checklist for web → native
```

`ios/App/Pods/`, `android/.gradle/`, `android/local.properties`, `*.keystore`, and Firebase config files are gitignored.

---

## Quick reference

| Command | What it does |
|---|---|
| `npm run cap:sync` | Copy plugin changes into both platforms |
| `npm run cap:ios` | Open the iOS project in Xcode |
| `npm run cap:android` | Open the Android project in Android Studio |
| `npx cap update` | Update Capacitor + plugins |
| `npx cap doctor` | Diagnose setup issues |

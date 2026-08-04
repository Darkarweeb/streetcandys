# StreetCandys — Mobile Build Guide (Capacitor)

## Architecture Overview

This project uses **Capacitor in "live reload / server URL" mode**:
- The native app loads `https://streetcandys.shop` inside a native WebView
- No static file bundling is required for the web content
- The existing Next.js web deployment remains **100% untouched**
- All Supabase auth, sessions, and data work identically on mobile

---

## Prerequisites

| Tool | Version | Required For |
|------|---------|-------------|
| Node.js | 18+ | All |
| npm | 9+ | All |
| Xcode | 15+ | iOS only |
| CocoaPods | latest | iOS only |
| Android Studio | Hedgehog+ | Android only |
| JDK | 17 | Android only |
| macOS | 13+ | iOS only |

---

## Step 1 — Create the mobile branch (FIRST)

```bash
bash scripts/create-mobile-branch.sh
```

This creates the `mobile-capacitor` branch. Your production `main` branch is untouched.

---

## Step 2 — Initial Setup (run once)

```bash
bash scripts/mobile-setup.sh
```

This installs all Capacitor packages, builds Next.js, adds iOS and Android platforms, and syncs.

---

## Step 3 — iOS Development

```bash
# Open in Xcode
npx cap open ios

# Or sync + open in one command
npx cap sync && npx cap open ios
```

### iOS Configuration Checklist (in Xcode)
- [ ] Set Bundle Identifier: `shop.streetcandys.app`
- [ ] Set Display Name: `StreetCandys`
- [ ] Set Version and Build numbers
- [ ] Select your Apple Developer Team
- [ ] Enable Push Notifications capability
- [ ] Enable Associated Domains: `applinks:streetcandys.shop`
- [ ] Replace app icon assets (see `mobile/app-icons-splash.md`)
- [ ] Replace LaunchScreen with branded splash

### iOS Build for TestFlight
```bash
bash scripts/build-ios.sh
```
Then in Xcode: Product → Archive → Distribute App → App Store Connect

---

## Step 4 — Android Development

```bash
# Open in Android Studio
npx cap open android

# Or sync + open
npx cap sync && npx cap open android
```

### Android Configuration Checklist (in Android Studio)
- [ ] Verify applicationId: `shop.streetcandys.app` in `android/app/build.gradle`
- [ ] Set versionName and versionCode
- [ ] Replace app icons in `android/app/src/main/res/mipmap-*/`
- [ ] Add `google-services.json` for Firebase/FCM (see push notifications guide)
- [ ] Add App Links intent-filter (see `mobile/android-deep-links.md`)
- [ ] Generate a release keystore

### Android Build for Play Store
```bash
bash scripts/build-android.sh
```
Upload the `.aab` file to Google Play Console.

---

## Day-to-Day Development Workflow

```bash
# After making web changes (they auto-reflect since we use server.url)
# No rebuild needed — just reload the app

# After changing capacitor.config.ts or adding plugins:
npx cap sync

# After adding a new Capacitor plugin:
npm install @capacitor/plugin-name
npx cap sync
```

---

## Deep Links

### iOS Universal Links
1. Deploy `apple-app-site-association` to `https://streetcandys.shop/.well-known/`
2. See `mobile/ios-deep-links.md` for the exact JSON content
3. Replace `TEAMID` with your Apple Developer Team ID

### Android App Links
1. Deploy `assetlinks.json` to `https://streetcandys.shop/.well-known/`
2. See `mobile/android-deep-links.md` for the exact JSON content
3. Replace `REPLACE_WITH_YOUR_SHA256_FINGERPRINT` with your keystore fingerprint

---

## App Icons & Splash Screen

See `mobile/app-icons-splash.md` for complete asset requirements and generation commands.

Quick method using `@capacitor/assets`:
```bash
npm install -D @capacitor/assets
# Place icon.png (1024×1024) and splash.png (2732×2732) in mobile/assets/
npx capacitor-assets generate --assetPath mobile/assets
```

---

## Push Notifications

See `mobile/push-notifications-setup.md` for complete Firebase/APNs setup.

The plugin is installed and the helper functions are ready in `src/lib/mobile/index.ts`:
- `requestPushPermissions()` — request permission and register
- `getPushToken()` — get the device token to save to your backend

---

## Supabase Authentication on Mobile

Supabase auth works identically on mobile because:
1. The app loads the production website (same domain, same cookies)
2. Session cookies are persisted in the native WebView
3. OAuth redirects use `https://streetcandys.shop/auth/callback` (already configured)

No changes to `AuthContext.tsx` or any auth code are required.

---

## Files Created / Modified

### New Files
| File | Purpose |
|------|---------|
| `capacitor.config.ts` | Main Capacitor configuration |
| `src/lib/mobile/index.ts` | Mobile utility functions (safe wrappers) |
| `src/components/mobile/CapacitorProvider.tsx` | Plugin initialisation component |
| `src/components/mobile/OfflineBanner.tsx` | Offline connectivity banner |
| `scripts/create-mobile-branch.sh` | Creates the mobile-capacitor git branch |
| `scripts/mobile-setup.sh` | One-time native project setup |
| `scripts/build-ios.sh` | iOS production build helper |
| `scripts/build-android.sh` | Android production build helper |
| `mobile/ios-deep-links.md` | iOS Universal Links config |
| `mobile/android-deep-links.md` | Android App Links config |
| `mobile/app-icons-splash.md` | App icon & splash screen guide |
| `mobile/push-notifications-setup.md` | Push notification setup guide |

### Modified Files
| File | Change |
|------|--------|
| `package.json` | Added all @capacitor/* packages |
| `src/app/layout.tsx` | Added CapacitorProvider + OfflineBanner |

---

## Manual Steps Required Before Publishing

### Apple App Store
1. [ ] Enroll in Apple Developer Program ($99/year)
2. [ ] Create App ID `shop.streetcandys.app` in developer.apple.com
3. [ ] Create App record in App Store Connect
4. [ ] Generate Distribution Certificate and Provisioning Profile
5. [ ] Replace app icons and splash screen assets
6. [ ] Deploy `apple-app-site-association` to your domain
7. [ ] Configure APNs key for push notifications (optional)
8. [ ] Archive and upload via Xcode → TestFlight → Production

### Google Play Store
1. [ ] Create Google Play Developer account ($25 one-time)
2. [ ] Create app in Play Console with package `shop.streetcandys.app`
3. [ ] Generate release keystore: `keytool -genkey -v -keystore streetcandys-release.jks -alias streetcandys -keyalg RSA -keysize 2048 -validity 10000`
4. [ ] Replace app icons
5. [ ] Deploy `assetlinks.json` to your domain
6. [ ] Add `google-services.json` for Firebase (optional, for push)
7. [ ] Build signed AAB and upload to Internal Testing → Production

---

## Troubleshooting

### "App loads blank white screen"
- Ensure `https://streetcandys.shop` is reachable
- Check `capacitor.config.ts` → `server.url` is correct
- On Android: verify `allowMixedContent: false` and the site uses HTTPS

### "Supabase auth redirects to browser instead of app"
- Ensure Associated Domains (iOS) / App Links (Android) are configured
- Verify the AASA / assetlinks.json files are deployed and accessible

### "Camera permission denied"
- iOS: Add `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription` to `ios/App/App/Info.plist`
- Android: Permissions are declared automatically by the Capacitor Camera plugin

### "Push notifications not working"
- Follow `mobile/push-notifications-setup.md` completely
- Ensure APNs key is uploaded to Firebase for iOS

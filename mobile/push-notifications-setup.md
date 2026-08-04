# StreetCandys — Push Notifications Setup Guide

## Overview
Push notification infrastructure is wired up and ready.
The `@capacitor/push-notifications` plugin is installed and configured.
Complete the steps below when you are ready to enable push notifications.

---

## iOS Setup

### 1. Enable Push Notifications capability in Xcode
- Open `ios/App/App.xcworkspace` in Xcode
- Select the App target → Signing & Capabilities
- Click "+ Capability" → Push Notifications
- Also add "Background Modes" → check "Remote notifications"

### 2. Create APNs Key in Apple Developer Portal
- Go to https://developer.apple.com/account/resources/authkeys/list
- Create a new key with "Apple Push Notifications service (APNs)" enabled
- Download the .p8 file — you will need it for your push provider (FCM / OneSignal / etc.)

### 3. Configure your push provider
Recommended: Firebase Cloud Messaging (FCM) — works for both iOS and Android.
- Create a Firebase project at https://console.firebase.google.com
- Add your iOS app (bundle ID: shop.streetcandys.app)
- Upload your APNs .p8 key in Firebase → Project Settings → Cloud Messaging
- Download GoogleService-Info.plist and add it to ios/App/App/

---

## Android Setup

### 1. Add Firebase to Android
- In Firebase Console → Add Android app (package: shop.streetcandys.app)
- Download google-services.json and place it in android/app/
- Add to android/build.gradle:
  ```
  classpath 'com.google.gms:google-services:4.4.0'
  ```
- Add to android/app/build.gradle:
  ```
  apply plugin: 'com.google.gms.google-services'
  ```

### 2. Add FCM dependency to android/app/build.gradle
```
implementation 'com.google.firebase:firebase-messaging:23.4.0'
```

---

## Requesting Permission (already implemented)

The `requestPushPermissions()` function in `src/lib/mobile/index.ts` handles
permission requests and device token registration. Call it after the user
opts in (e.g., after first login or from account settings).

```typescript
import { requestPushPermissions, getPushToken } from '@/lib/mobile';

// Request permission
const granted = await requestPushPermissions();
if (granted) {
  const token = await getPushToken();
  // Save token to your backend / Supabase profiles table
}
```

---

## Supabase Integration (recommended)
Store push tokens in the `profiles` table:
```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
```
Then update the token after registration and use it from your backend
(Edge Function or server) to send targeted notifications.

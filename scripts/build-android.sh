#!/usr/bin/env bash
# =============================================================================
# StreetCandys — Android Production Build (Google Play)
# Prerequisites: Android Studio, JDK 17+, Android SDK
# =============================================================================

set -e

echo "🤖 Building StreetCandys for Android..."

# 1. Install / update dependencies
npm install

# 2. Build Next.js
npm run build

# 3. Sync Capacitor
npx cap sync android

# 4. Build release APK / AAB
echo ""
echo "Building Android App Bundle (AAB) for Play Store..."
cd android
./gradlew bundleRelease

echo ""
echo "✅ AAB built at: android/app/build/outputs/bundle/release/app-release.aab"
echo ""
echo "Sign the AAB:"
echo "  jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \\"
echo "    -keystore your-release-key.jks \\"
echo "    android/app/build/outputs/bundle/release/app-release.aab \\"
echo "    your-key-alias"
echo ""
echo "Then upload to Google Play Console → Internal Testing → Production"
echo ""
echo "Package name: shop.streetcandys.app"

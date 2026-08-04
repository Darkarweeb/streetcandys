#!/usr/bin/env bash
# =============================================================================
# StreetCandys — iOS Production Build (App Store / TestFlight)
# Prerequisites: macOS, Xcode 15+, Apple Developer account
# =============================================================================

set -e

echo "🍎 Building StreetCandys for iOS..."

# 1. Install / update dependencies
npm install

# 2. Build Next.js
npm run build

# 3. Sync Capacitor
npx cap sync ios

# 4. Open Xcode for final archive step
echo ""
echo "Opening Xcode..."
npx cap open ios

echo ""
echo "In Xcode:"
echo "  1. Select 'Any iOS Device (arm64)' as the build target"
echo "  2. Product → Archive"
echo "  3. Organizer → Distribute App → App Store Connect"
echo "  4. Upload to TestFlight"
echo ""
echo "Bundle ID:  shop.streetcandys.app"
echo "Version:    Set in Xcode → General → Version"

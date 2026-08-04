#!/usr/bin/env bash
# =============================================================================
# StreetCandys — Capacitor Mobile Setup Script
# Run this ONCE after cloning the mobile-capacitor branch.
# Prerequisites: Node 18+, npm, Xcode (iOS), Android Studio (Android)
# =============================================================================

set -e

echo "🍬 StreetCandys — Capacitor Mobile Setup" echo"========================================="

# 1. Install dependencies (Capacitor packages added to package.json)
echo "" echo"📦 Installing npm dependencies..."
npm install

# 2. Build the Next.js project (needed for Capacitor to copy web assets)
#    Even though we use server.url (production domain), the native projects
#    still need a valid www/ directory to initialise.
echo "" echo"🔨 Building Next.js..."
npm run build

# 3. Export static assets to 'out/' directory for Capacitor's webDir
#    Note: Because we use server.url, this is only used as a fallback.
echo "" echo"📤 Exporting static assets..."
npx next export --outdir out 2>/dev/null || echo "  (Static export skipped — using server.url mode)"

# 4. Initialise Capacitor (only if not already initialised)
if [ ! -f "capacitor.config.ts" ]; then
  echo "" echo"⚡ Initialising Capacitor..." npx cap init"StreetCandys" "shop.streetcandys.app" --web-dir out
fi

# 5. Add iOS platform
echo "" echo"🍎 Adding iOS platform..."
npx cap add ios

# 6. Add Android platform
echo "" echo"🤖 Adding Android platform..."
npx cap add android

# 7. Sync native projects
echo "" echo"🔄 Syncing Capacitor..."
npx cap sync

echo "" echo"✅ Setup complete!" echo"" echo"Next steps:" echo"  iOS:     npx cap open ios     (requires Xcode)" echo"  Android: npx cap open android (requires Android Studio)" echo"" echo"See MOBILE_BUILD_GUIDE.md for full build instructions."

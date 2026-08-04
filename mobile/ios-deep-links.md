# StreetCandys iOS — Deep Link / Universal Link Configuration
# File: ios/App/App/entitlements/App.entitlements
# Add this to your Xcode project entitlements file.

# Associated Domains entitlement (add in Xcode → Signing & Capabilities → Associated Domains):
# applinks:streetcandys.shop
# applinks:www.streetcandys.shop

# ─── apple-app-site-association (AASA) ───────────────────────────────────────
# Deploy this file to: https://streetcandys.shop/.well-known/apple-app-site-association
# Content-Type: application/json (no .json extension)

{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.shop.streetcandys.app",
        "paths": [
          "/productos/*",
          "/cuenta/*",
          "/admin/*",
          "/checkout",
          "/orden-confirmada/*",
          "/iniciar-sesion",
          "/registro",
          "/auth/callback",
          "/*"
        ]
      }
    ]
  },
  "webcredentials": {
    "apps": ["TEAMID.shop.streetcandys.app"]
  }
}

# IMPORTANT: Replace TEAMID with your Apple Developer Team ID (10-character string).
# Find it at: https://developer.apple.com/account → Membership → Team ID

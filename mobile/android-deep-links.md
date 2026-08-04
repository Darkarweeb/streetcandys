# StreetCandys Android — Deep Link / App Links Configuration
# Add the following intent-filter to android/app/src/main/AndroidManifest.xml
# inside the <activity> tag.

# ─── AndroidManifest.xml intent-filter ───────────────────────────────────────
# Add this block inside <activity android:name=".MainActivity" ...>

<!--
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="streetcandys.shop" />
</intent-filter>

<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="www.streetcandys.shop" />
</intent-filter>
-->

# ─── assetlinks.json ─────────────────────────────────────────────────────────
# Deploy this file to: https://streetcandys.shop/.well-known/assetlinks.json

[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "shop.streetcandys.app",
      "sha256_cert_fingerprints": [
        "REPLACE_WITH_YOUR_SHA256_FINGERPRINT"
      ]
    }
  }
]

# Get your SHA-256 fingerprint:
#   Debug:    keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
#   Release:  keytool -list -v -keystore your-release-key.jks -alias your-alias

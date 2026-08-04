# StreetCandys — App Icons & Splash Screen Assets
# 
# Place your source images here, then run the generation commands below.
# Required source files:
#   - icon.png       (1024×1024 px, no transparency, no rounded corners)
#   - splash.png     (2732×2732 px, centered logo on white background)

## Generating Icons & Splash Screens

### Option A — @capacitor/assets (recommended)
```bash
npm install -D @capacitor/assets
npx capacitor-assets generate --assetPath mobile/assets
```

### Option B — Manual placement

#### iOS Icons (place in ios/App/App/Assets.xcassets/AppIcon.appiconset/)
| Size       | File                    |
|------------|-------------------------|
| 20×20      | Icon-20.png             |
| 40×40      | Icon-20@2x.png          |
| 60×60      | Icon-20@3x.png          |
| 29×29      | Icon-29.png             |
| 58×58      | Icon-29@2x.png          |
| 87×87      | Icon-29@3x.png          |
| 40×40      | Icon-40.png             |
| 80×80      | Icon-40@2x.png          |
| 120×120    | Icon-40@3x.png          |
| 120×120    | Icon-60@2x.png          |
| 180×180    | Icon-60@3x.png          |
| 76×76      | Icon-76.png             |
| 152×152    | Icon-76@2x.png          |
| 167×167    | Icon-83.5@2x.png        |
| 1024×1024  | ItunesArtwork@2x.png    |

#### Android Icons (place in android/app/src/main/res/)
| Folder           | Size    | File              |
|------------------|---------|-------------------|
| mipmap-mdpi      | 48×48   | ic_launcher.png   |
| mipmap-hdpi      | 72×72   | ic_launcher.png   |
| mipmap-xhdpi     | 96×96   | ic_launcher.png   |
| mipmap-xxhdpi    | 144×144 | ic_launcher.png   |
| mipmap-xxxhdpi   | 192×192 | ic_launcher.png   |

#### Android Adaptive Icons
Place in android/app/src/main/res/mipmap-anydpi-v26/:
- ic_launcher.xml (references foreground + background layers)
- ic_launcher_round.xml

## Splash Screen

### iOS
Place LaunchScreen.storyboard in ios/App/App/
The default Capacitor storyboard uses a centered image — replace the image
reference with your splash.png asset.

### Android
Place splash.png in android/app/src/main/res/drawable/splash.png
The splash screen is configured via capacitor.config.ts (already done).

import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'shop.streetcandys.app',
  appName: "StreetCandy's",
  // Load the production website instead of bundled static files.
  // This keeps the web deployment fully intact and avoids duplicating the build.
  server: {
    url: 'https://streetcandys.shop',
    cleartext: false, // HTTPS only — no cleartext HTTP allowed
    androidScheme: 'https',
    // Allow navigation within the production domain
    allowNavigation: [
      'streetcandys.shop',
      '*.streetcandys.shop',
      'streetcand8616.builtwithrocket.new',
    ],
  },
  // iOS-specific configuration
  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
    scrollEnabled: true,
    backgroundColor: '#163317',
    // Liminal / safe-area support
    liminalColor: '#163317',
  },
  // Android-specific configuration
  android: {
    backgroundColor: '#163317',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // set true only for debug builds
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#163317',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DEFAULT',
      backgroundColor: '#163317',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Camera: {
      // Permissions are declared in native manifests
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#488AFF',
      sound: 'beep.wav',
    },
  },
};

export default config;

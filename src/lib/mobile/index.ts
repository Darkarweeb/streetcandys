/**
 * Mobile utilities for Capacitor integration.
 * Provides safe wrappers for Capacitor plugins that gracefully degrade on web.
 *
 * IMPORTANT: No top-level imports from @capacitor/* are allowed in this file.
 * All Capacitor modules must be loaded via the dynamicCapacitorImport() helper
 * so webpack cannot statically trace them into the web/SSR bundle.
 * This prevents the "undefined is not an object (evaluating 'originalFactory.call')"
 * error that occurs when native module factories are evaluated in a browser context.
 */

// ─── Safe dynamic loader ──────────────────────────────────────────────────────
// Using a variable for the package name prevents webpack from statically
// resolving the import at build time. The externals config in next.config.mjs
// is the primary guard; this is a belt-and-suspenders measure.

async function dynamicCapacitorImport<T = unknown>(packageName: string): Promise<T | null> {
  if (typeof window === 'undefined') return null; // SSR — never load
  try {
    // Indirection via variable prevents webpack static analysis
    const pkg = packageName;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await import(/* webpackIgnore: true */ pkg as any);
    return mod as T;
  } catch {
    return null;
  }
}

// ─── Platform Detection ───────────────────────────────────────────────────────

let _capacitorCore: { Capacitor: { isNativePlatform(): boolean; getPlatform(): string } } | null = null;

async function getCapacitorCore() {
  if (_capacitorCore) return _capacitorCore;
  _capacitorCore = await dynamicCapacitorImport('@capacitor/core');
  return _capacitorCore;
}

export const isNative = (): boolean => {
  // Synchronous check — relies on the Capacitor global injected by the native WebView.
  // On web/SSR this global is never present, so we safely return false.
  if (typeof window === 'undefined') return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cap = (window as any).Capacitor;
    return cap != null && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform();
  } catch {
    return false;
  }
};

export const isIOS = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cap = (window as any).Capacitor;
    return cap != null && cap.getPlatform?.() === 'ios';
  } catch {
    return false;
  }
};

export const isAndroid = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cap = (window as any).Capacitor;
    return cap != null && cap.getPlatform?.() === 'android';
  } catch {
    return false;
  }
};

export const isWeb = (): boolean => {
  if (typeof window === 'undefined') return true;
  return !isNative();
};

// ─── Status Bar ───────────────────────────────────────────────────────────────

export async function setStatusBarLight() {
  if (!isNative()) return;
  try {
    const mod = await dynamicCapacitorImport<{ StatusBar: { setStyle(o: object): Promise<void>; setBackgroundColor(o: object): Promise<void> }; Style: { Light: string } }>('@capacitor/status-bar');
    if (!mod) return;
    await mod.StatusBar.setStyle({ style: mod.Style.Light });
    if (isAndroid()) {
      await mod.StatusBar.setBackgroundColor({ color: '#ffffff' });
    }
  } catch (e) {
    console.warn('[Mobile] StatusBar not available:', e);
  }
}

export async function setStatusBarDark() {
  if (!isNative()) return;
  try {
    const mod = await dynamicCapacitorImport<{ StatusBar: { setStyle(o: object): Promise<void>; setBackgroundColor(o: object): Promise<void> }; Style: { Dark: string } }>('@capacitor/status-bar');
    if (!mod) return;
    await mod.StatusBar.setStyle({ style: mod.Style.Dark });
    if (isAndroid()) {
      await mod.StatusBar.setBackgroundColor({ color: '#1a1a1a' });
    }
  } catch (e) {
    console.warn('[Mobile] StatusBar not available:', e);
  }
}

// ─── Splash Screen ────────────────────────────────────────────────────────────

export async function hideSplashScreen() {
  if (!isNative()) return;
  try {
    const mod = await dynamicCapacitorImport<{ SplashScreen: { hide(o: object): Promise<void> } }>('@capacitor/splash-screen');
    if (!mod) return;
    await mod.SplashScreen.hide({ fadeOutDuration: 300 });
  } catch (e) {
    console.warn('[Mobile] SplashScreen not available:', e);
  }
}

// ─── Network ─────────────────────────────────────────────────────────────────

export async function getNetworkStatus(): Promise<{ connected: boolean; connectionType: string }> {
  if (!isNative()) return { connected: true, connectionType: 'wifi' };
  try {
    const mod = await dynamicCapacitorImport<{ Network: { getStatus(): Promise<{ connected: boolean; connectionType: string }> } }>('@capacitor/network');
    if (!mod) return { connected: true, connectionType: 'unknown' };
    return await mod.Network.getStatus();
  } catch (e) {
    console.warn('[Mobile] Network not available:', e);
    return { connected: true, connectionType: 'unknown' };
  }
}

export async function addNetworkListener(
  callback: (status: { connected: boolean; connectionType: string }) => void
): Promise<{ remove: () => void }> {
  if (!isNative()) return { remove: () => {} };
  try {
    const mod = await dynamicCapacitorImport<{ Network: { addListener(event: string, cb: (s: { connected: boolean; connectionType: string }) => void): Promise<{ remove(): void }> } }>('@capacitor/network');
    if (!mod) return { remove: () => {} };
    return await mod.Network.addListener('networkStatusChange', callback);
  } catch (e) {
    console.warn('[Mobile] Network listener not available:', e);
    return { remove: () => {} };
  }
}

// ─── Haptics ─────────────────────────────────────────────────────────────────

export async function hapticImpact(style: 'LIGHT' | 'MEDIUM' | 'HEAVY' = 'LIGHT') {
  if (!isNative()) return;
  try {
    const mod = await dynamicCapacitorImport<{ Haptics: { impact(o: object): Promise<void> }; ImpactStyle: Record<string, string> }>('@capacitor/haptics');
    if (!mod) return;
    await mod.Haptics.impact({ style: mod.ImpactStyle[style] });
  } catch {
    // Haptics are optional — silent fail
  }
}

export async function hapticNotification(type: 'SUCCESS' | 'WARNING' | 'ERROR' = 'SUCCESS') {
  if (!isNative()) return;
  try {
    const mod = await dynamicCapacitorImport<{ Haptics: { notification(o: object): Promise<void> }; NotificationType: Record<string, string> }>('@capacitor/haptics');
    if (!mod) return;
    await mod.Haptics.notification({ type: mod.NotificationType[type] });
  } catch {
    // Silent fail
  }
}

// ─── Camera / File Upload ─────────────────────────────────────────────────────

export interface CapturedPhoto {
  base64String?: string;
  dataUrl?: string;
  path?: string;
  webPath?: string;
  format: string;
}

export async function takePhoto(): Promise<CapturedPhoto | null> {
  if (!isNative()) return null;
  try {
    const mod = await dynamicCapacitorImport<{
      Camera: { getPhoto(o: object): Promise<CapturedPhoto> };
      CameraResultType: Record<string, string>;
      CameraSource: Record<string, string>;
    }>('@capacitor/camera');
    if (!mod) return null;
    const photo = await mod.Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: mod.CameraResultType.DataUrl,
      source: mod.CameraSource.Prompt,
      saveToGallery: false,
    });
    return photo;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('cancelled') || msg.includes('canceled')) return null;
    console.warn('[Mobile] Camera error:', e);
    return null;
  }
}

export async function pickFromGallery(): Promise<CapturedPhoto | null> {
  if (!isNative()) return null;
  try {
    const mod = await dynamicCapacitorImport<{
      Camera: { getPhoto(o: object): Promise<CapturedPhoto> };
      CameraResultType: Record<string, string>;
      CameraSource: Record<string, string>;
    }>('@capacitor/camera');
    if (!mod) return null;
    const photo = await mod.Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: mod.CameraResultType.DataUrl,
      source: mod.CameraSource.Photos,
    });
    return photo;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('cancelled') || msg.includes('canceled')) return null;
    console.warn('[Mobile] Gallery error:', e);
    return null;
  }
}

// ─── Deep Link Handler ────────────────────────────────────────────────────────

export async function setupDeepLinkHandler(onDeepLink: (url: string) => void) {
  if (!isNative()) return;
  try {
    const mod = await dynamicCapacitorImport<{ App: { addListener(event: string, cb: (e: { url: string }) => void): Promise<void> } }>('@capacitor/app');
    if (!mod) return;
    await mod.App.addListener('appUrlOpen', (event) => {
      console.log('[Mobile] Deep link received:', event.url);
      onDeepLink(event.url);
    });
  } catch (e) {
    console.warn('[Mobile] Deep link handler not available:', e);
  }
}

// ─── Push Notifications ───────────────────────────────────────────────────────

export async function requestPushPermissions(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const mod = await dynamicCapacitorImport<{
      PushNotifications: {
        requestPermissions(): Promise<{ receive: string }>;
        register(): Promise<void>;
        addListener(event: string, cb: (token: { value: string }) => void): Promise<void>;
      };
    }>('@capacitor/push-notifications');
    if (!mod) return false;
    const result = await mod.PushNotifications.requestPermissions();
    if (result.receive === 'granted') {
      await mod.PushNotifications.register();
      return true;
    }
    return false;
  } catch (e) {
    console.warn('[Mobile] Push notifications not available:', e);
    return false;
  }
}

export async function getPushToken(): Promise<string | null> {
  if (!isNative()) return null;
  return new Promise((resolve) => {
    dynamicCapacitorImport<{
      PushNotifications: {
        addListener(event: string, cb: (token: { value: string }) => void): Promise<void>;
      };
    }>('@capacitor/push-notifications').then((mod) => {
      if (!mod) return resolve(null);
      mod.PushNotifications.addListener('registration', (token) => {
        resolve(token.value);
      });
      mod.PushNotifications.addListener('registrationError', () => {
        resolve(null);
      });
    }).catch(() => resolve(null));
  });
}

// ─── App State ────────────────────────────────────────────────────────────────

export async function addAppStateListener(callbacks: {
  onForeground?: () => void;
  onBackground?: () => void;
}) {
  if (!isNative()) return;
  try {
    const mod = await dynamicCapacitorImport<{ App: { addListener(event: string, cb: (s: { isActive: boolean }) => void): Promise<void> } }>('@capacitor/app');
    if (!mod) return;
    await mod.App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) callbacks.onForeground?.();
      else callbacks.onBackground?.();
    });
  } catch (e) {
    console.warn('[Mobile] App state listener not available:', e);
  }
}

// ─── Keyboard ─────────────────────────────────────────────────────────────────

export async function setupKeyboard() {
  if (!isNative()) return;
  try {
    const mod = await dynamicCapacitorImport<{ Keyboard: { setAccessoryBarVisible(o: object): Promise<void> } }>('@capacitor/keyboard');
    if (!mod) return;
    await mod.Keyboard.setAccessoryBarVisible({ isVisible: true });
  } catch (e) {
    console.warn('[Mobile] Keyboard setup not available:', e);
  }
}

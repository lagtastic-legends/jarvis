import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { AppLauncher } from '@capacitor/app-launcher';

/**
 * JARVIS Native Android Bridge Service
 * Provides direct access to Android hardware (Camera, Haptics, Status Bar, App Launcher)
 * when running inside the Capacitor Android native wrapper.
 */
export class NativeAndroidService {
  public isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  public isAndroid(): boolean {
    return Capacitor.getPlatform() === 'android';
  }

  /**
   * Configures Edge-to-Edge immersive HUD on Android
   */
  public async initStatusBar(): Promise<void> {
    if (!this.isNative()) return;
    try {
      await StatusBar.setStyle({ style: Style.Dark });
      if (this.isAndroid()) {
        await StatusBar.setBackgroundColor({ color: '#020617' }); // Slate-950 matching HUD
        await StatusBar.setOverlaysWebView({ overlay: false });
      }
    } catch (err) {
      console.warn('[ANDROID_NATIVE] StatusBar configuration warning:', err);
    }
  }

  /**
   * Tactile Haptic Feedback for state changes, tactical chirps, and vocal visemes
   */
  public async triggerHaptic(
    type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light'
  ): Promise<void> {
    if (!this.isNative()) return;
    try {
      switch (type) {
        case 'light':
          await Haptics.impact({ style: ImpactStyle.Light });
          break;
        case 'medium':
          await Haptics.impact({ style: ImpactStyle.Medium });
          break;
        case 'heavy':
          await Haptics.impact({ style: ImpactStyle.Heavy });
          break;
        case 'success':
          await Haptics.notification({ type: NotificationType.Success });
          break;
        case 'warning':
          await Haptics.notification({ type: NotificationType.Warning });
          break;
        case 'error':
          await Haptics.notification({ type: NotificationType.Error });
          break;
      }
    } catch (err) {
      console.warn('[ANDROID_NATIVE] Haptics warning:', err);
    }
  }

  /**
   * High-resolution camera snapshot using Android native Camera API
   */
  public async captureNativePhoto(): Promise<{ base64: string; mimeType: string } | null> {
    if (!this.isNative()) return null;
    try {
      const image = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        width: 1920,
        height: 1080,
      });

      if (image.base64String) {
        return {
          base64: image.base64String,
          mimeType: `image/${image.format || 'jpeg'}`,
        };
      }
      return null;
    } catch (err) {
      console.warn('[ANDROID_NATIVE] Camera snapshot cancelled or failed:', err);
      return null;
    }
  }

  /**
   * Launch Android Native Applications via URL schemes or package intents
   */
  public async launchAndroidApp(target: string): Promise<boolean> {
    if (!this.isNative()) return false;
    const lower = (target || '').toLowerCase().trim();

    // Map common application intent URIs
    let uri = '';
    if (lower.includes('whatsapp')) uri = 'whatsapp://';
    else if (lower.includes('spotify')) uri = 'spotify://';
    else if (lower.includes('youtube')) uri = 'vnd.youtube://';
    else if (lower.includes('map') || lower.includes('navigation')) uri = 'geo:0,0?q=';
    else if (lower.startsWith('http://') || lower.startsWith('https://')) uri = target;

    try {
      if (uri) {
        const canOpen = await AppLauncher.canOpenUrl({ url: uri });
        if (canOpen.value) {
          await AppLauncher.openUrl({ url: uri });
          return true;
        }
      }
      // Direct URL fallback
      if (target.startsWith('http')) {
        await AppLauncher.openUrl({ url: target });
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[ANDROID_NATIVE] AppLauncher warning:', err);
      return false;
    }
  }
}

export const nativeAndroid = new NativeAndroidService();

import { ClientAction } from '../types/jarvis';
import { api } from './api';
import { visionCapture } from './visionCapture';
import { speechEngine } from './speechEngine';
import { nativeAndroid } from './nativeAndroid';

export interface ActionExecutorCallbacks {
  onSwitchTab?: (tab: string) => void;
  onToggleVoice?: (enabled: boolean) => void;
  onClearChat?: () => void;
  onTasksUpdated?: () => void;
  onShowToast?: (message: string) => void;
}

export class JarvisActionExecutor {
  private callbacks: ActionExecutorCallbacks = {};

  public registerCallbacks(callbacks: ActionExecutorCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public isMobile(): boolean {
    if (typeof window === 'undefined' || !navigator) return false;
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  /**
   * Dispatches and executes an individual client action
   */
  public async execute(action: ClientAction): Promise<{ success: boolean; message: string }> {
    try {
      switch (action.type) {
        case 'OPEN_APP':
          return this.handleOpenApp(action.payload);

        case 'OPEN_MULTIPLE_WINDOWS':
          return this.handleOpenMultipleWindows(action.payload);

        case 'COMPOSE_EMAIL':
          return this.handleComposeEmail(action.payload);

        case 'REPLY_TO_MESSAGE':
          return this.handleReplyToMessage(action.payload);

        case 'MANAGE_TASK':
          return this.handleManageTask(action.payload);

        case 'SYSTEM_CONTROL':
          return this.handleSystemControl(action.payload);

        case 'MANAGE_APP_NOTIFICATIONS':
          return this.handleManageAppNotifications(action.payload);

        case 'FIND_LOCAL_FILE':
          return this.handleFindLocalFile(action.payload);

        case 'EXECUTE_DEVICE_ROUTINE':
          return this.handleExecuteDeviceRoutine(action.payload);

        case 'DIAGNOSE_AND_OPEN_SETTING':
          return this.handleDiagnoseAndOpenSetting(action.payload);

        case 'CAPTURE_AND_ANALYZE_SCREEN':
          return this.handleCaptureAndAnalyzeScreen(action.payload);

        default:
          return { success: false, message: `Unknown action type: ${(action as any).type}` };
      }
    } catch (err: any) {
      console.warn('[ACTION_EXECUTOR] Execution error:', err);
      return { success: false, message: err.message || 'Execution anomaly' };
    }
  }

  /**
   * Executes a list of client actions sequentially
   */
  public async executeAll(actions: ClientAction[] = []): Promise<void> {
    for (const a of actions) {
      await this.execute(a);
    }
  }

  // 1. OPEN_APP
  public handleOpenApp(payload: Record<string, any>): { success: boolean; message: string } {
    const { appName, targetUrlOrPath, hostExecuted } = payload;
    const nameLower = (appName || '').toLowerCase();
    const isMobile = this.isMobile();

    // Map common mobile intents and web URLs
    const appMap: Record<string, { mobileUri: string; webUrl: string }> = {
      whatsapp: { mobileUri: 'whatsapp://', webUrl: 'https://web.whatsapp.com' },
      youtube: { mobileUri: 'vnd.youtube://', webUrl: 'https://youtube.com' },
      spotify: { mobileUri: 'spotify://', webUrl: 'https://open.spotify.com' },
      gmail: { mobileUri: 'googlegmail://', webUrl: 'https://mail.google.com' },
      maps: { mobileUri: 'geo:0,0?q=', webUrl: 'https://maps.google.com' },
      github: { mobileUri: 'https://github.com', webUrl: 'https://github.com' },
      twitter: { mobileUri: 'twitter://', webUrl: 'https://x.com' },
      x: { mobileUri: 'twitter://', webUrl: 'https://x.com' },
      calculator: { mobileUri: 'calc:', webUrl: 'https://www.google.com/search?q=calculator' },
      terminal: { mobileUri: '', webUrl: '' },
    };

    let targetUrl = targetUrlOrPath || '';
    for (const [key, config] of Object.entries(appMap)) {
      if (nameLower.includes(key)) {
        targetUrl = isMobile && config.mobileUri ? config.mobileUri : config.webUrl;
        break;
      }
    }

    if (!targetUrl && (nameLower.includes('.com') || nameLower.includes('.org') || nameLower.includes('http'))) {
      targetUrl = targetUrlOrPath?.startsWith('http') ? targetUrlOrPath : `https://${appName}`;
    }

    if (nativeAndroid.isNative() && targetUrl) {
      nativeAndroid.launchAndroidApp(targetUrl);
      this.callbacks.onShowToast?.(`Launching ${appName} on Android device`);
      return { success: true, message: `Dispatched native intent for ${appName}` };
    }

    if (isMobile && targetUrl) {
      window.location.href = targetUrl;
      this.callbacks.onShowToast?.(`Launching ${appName} on device`);
      return { success: true, message: `Dispatched to ${targetUrl}` };
    }

    if (targetUrl && (!hostExecuted || targetUrl.startsWith('http'))) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      this.callbacks.onShowToast?.(`Launched ${appName} in browser window`);
      return { success: true, message: `Opened window at ${targetUrl}` };
    }

    if (hostExecuted) {
      this.callbacks.onShowToast?.(`Dispatched native command to host: ${appName}`);
      return { success: true, message: `Executed on host operating system` };
    }

    return { success: true, message: `Action registered for ${appName}` };
  }

  // 2. OPEN_MULTIPLE_WINDOWS
  public handleOpenMultipleWindows(payload: Record<string, any>): { success: boolean; message: string } {
    const windows = Array.isArray(payload.windows) ? payload.windows : [];
    if (windows.length === 0) return { success: false, message: 'No windows specified' };

    // Common web URL resolver
    const resolveUrl = (appOrSite: string, urlOrArgs?: string): string => {
      if (urlOrArgs && urlOrArgs.startsWith('http')) return urlOrArgs;
      const lower = appOrSite.toLowerCase();
      if (lower.includes('youtube')) return 'https://youtube.com';
      if (lower.includes('github')) return 'https://github.com';
      if (lower.includes('gmail') || lower.includes('mail')) return 'https://mail.google.com';
      if (lower.includes('spotify')) return 'https://open.spotify.com';
      if (lower.includes('twitter') || lower.includes('x')) return 'https://x.com';
      if (lower.includes('reddit')) return 'https://reddit.com';
      if (lower.includes('chatgpt')) return 'https://chatgpt.com';
      if (lower.includes('claude')) return 'https://claude.ai';
      if (lower.includes('.com') || lower.includes('.org') || lower.includes('.io')) {
        return lower.startsWith('http') ? lower : `https://${lower}`;
      }
      return `https://www.google.com/search?q=${encodeURIComponent(appOrSite)}`;
    };

    // Stagger opening coordinated windows
    windows.forEach((win, index) => {
      const url = resolveUrl(win.appOrSite, win.urlOrArgs);
      const left = 100 + index * 50;
      const top = 80 + index * 40;
      const features = `width=960,height=720,left=${left},top=${top},noopener,noreferrer,resizable=yes,scrollbars=yes`;
      try {
        window.open(url, `_jarvis_win_${index}_${Date.now()}`, features);
      } catch (err) {
        console.warn(`[ACTION] Could not pop window ${index}:`, err);
      }
    });

    this.callbacks.onShowToast?.(`Deployed ${windows.length} workspace windows`);
    return { success: true, message: `Deployed ${windows.length} coordinated windows` };
  }

  // 3. COMPOSE_EMAIL
  public handleComposeEmail(payload: Record<string, any>): { success: boolean; message: string } {
    const { to = '', subject = '', body = '', autoOpenClient = true } = payload;

    const mailtoUri = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // Copy draft content to clipboard as an instant fallback
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`).catch(() => {});
    }

    if (autoOpenClient) {
      if (this.isMobile()) {
        window.location.href = mailtoUri;
      } else {
        window.open(gmailComposeUrl, '_blank', 'noopener,noreferrer');
      }
      this.callbacks.onShowToast?.(`Email draft ready and dispatched to mail client`);
    }

    return { success: true, message: `Draft prepared for ${to || 'recipient'}` };
  }

  // 4. REPLY_TO_MESSAGE
  public handleReplyToMessage(payload: Record<string, any>): { success: boolean; message: string } {
    const { platform = 'whatsapp', recipient = '', phoneOrHandle = '', messageText = '', autoLaunch = true } = payload;
    const cleanPhone = (phoneOrHandle || '').replace(/\D/g, '');

    let targetUri = '';
    let webFallback = '';

    if (platform === 'whatsapp') {
      targetUri = cleanPhone
        ? `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`
        : `whatsapp://send?text=${encodeURIComponent(messageText)}`;
      webFallback = cleanPhone
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
        : `https://web.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;
    } else if (platform === 'sms') {
      targetUri = cleanPhone
        ? `sms:${cleanPhone}?body=${encodeURIComponent(messageText)}`
        : `sms:?body=${encodeURIComponent(messageText)}`;
      webFallback = targetUri;
    } else if (platform === 'telegram') {
      targetUri = `tg://msg?text=${encodeURIComponent(messageText)}`;
      webFallback = `https://t.me/share/url?url=&text=${encodeURIComponent(messageText)}`;
    }

    // Auto-copy response to clipboard
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(messageText).catch(() => {});
    }

    if (autoLaunch) {
      if (this.isMobile()) {
        window.location.href = targetUri || webFallback;
      } else if (webFallback) {
        window.open(webFallback, '_blank', 'noopener,noreferrer');
      }
      this.callbacks.onShowToast?.(`Copied reply and opening ${platform.toUpperCase()}`);
    }

    return { success: true, message: `Reply prepared for ${recipient || platform}` };
  }

  // 5. MANAGE_TASK
  public handleManageTask(payload: Record<string, any>): { success: boolean; message: string } {
    this.callbacks.onTasksUpdated?.();
    this.callbacks.onShowToast?.(`Directive "${payload.title || 'Task'}" committed to operational matrix`);
    return { success: true, message: `Task operation executed: ${payload.action || 'create'}` };
  }

  // 6. SYSTEM_CONTROL
  public handleSystemControl(payload: Record<string, any>): { success: boolean; message: string } {
    const { command, targetTab } = payload;

    switch (command) {
      case 'switch_tab':
        if (targetTab && this.callbacks.onSwitchTab) {
          this.callbacks.onSwitchTab(targetTab);
          this.callbacks.onShowToast?.(`Switched HUD interface to ${targetTab.toUpperCase()}`);
        }
        break;

      case 'mute_voice':
        this.callbacks.onToggleVoice?.(false);
        this.callbacks.onShowToast?.('Voice synthesizer muted');
        break;

      case 'unmute_voice':
        this.callbacks.onToggleVoice?.(true);
        this.callbacks.onShowToast?.('Voice synthesizer unmuted');
        break;

      case 'clear_chat':
        this.callbacks.onClearChat?.();
        this.callbacks.onShowToast?.('Neural chat telemetry purged');
        break;

      case 'system_status':
        this.callbacks.onShowToast?.('All systems 100% nominal. Quantum shields locked.');
        break;
    }

    return { success: true, message: `System control: ${command}` };
  }

  // 7. MANAGE_APP_NOTIFICATIONS
  public handleManageAppNotifications(payload: Record<string, any>): { success: boolean; message: string } {
    const apps = Array.isArray(payload.apps) ? payload.apps : [];
    const current = this.getStoredNotificationStates();

    apps.forEach((app: any) => {
      if (app.appName) {
        current[app.appName.toLowerCase()] = Boolean(app.allowNotifications);
      }
    });

    try {
      localStorage.setItem('jarvis_app_notifications', JSON.stringify(current));
      window.dispatchEvent(new CustomEvent('jarvis-notifications-change', { detail: current }));
    } catch {
      //
    }

    const appNames = apps.map((a: any) => a.appName).join(', ');
    this.callbacks.onShowToast?.(`Updated notification preferences for ${appNames || 'apps'}`);
    return { success: true, message: `Updated notifications for ${appNames}` };
  }

  public getStoredNotificationStates(): Record<string, boolean> {
    try {
      const raw = localStorage.getItem('jarvis_app_notifications');
      return raw ? JSON.parse(raw) : { youtube: false, spotify: false, netflix: false };
    } catch {
      return { youtube: false, spotify: false, netflix: false };
    }
  }

  public saveNotificationToggle(appName: string, allow: boolean) {
    const current = this.getStoredNotificationStates();
    current[appName.toLowerCase()] = allow;
    try {
      localStorage.setItem('jarvis_app_notifications', JSON.stringify(current));
      window.dispatchEvent(new CustomEvent('jarvis-notifications-change', { detail: current }));
    } catch {
      //
    }
    this.callbacks.onShowToast?.(`${appName} notifications ${allow ? 'ALLOWED' : 'MUTED'}`);
  }

  // 8. FIND_LOCAL_FILE
  public handleFindLocalFile(payload: Record<string, any>): { success: boolean; message: string } {
    const files = Array.isArray(payload.files) ? payload.files : [];
    this.callbacks.onShowToast?.(
      files.length > 0
        ? `Located ${files.length} files matching "${payload.query}"`
        : `Searched local vault for "${payload.query}"`
    );
    return { success: true, message: `Located ${files.length} matches for "${payload.query}"` };
  }

  // 9. EXECUTE_DEVICE_ROUTINE
  public handleExecuteDeviceRoutine(payload: Record<string, any>): { success: boolean; message: string } {
    const { routineName, steps = {} } = payload;

    // 1. Eye Comfort Warm Filter
    if (steps.eyeComfortShield !== undefined) {
      this.setEyeComfortShield(Boolean(steps.eyeComfortShield));
    }

    // 2. Hardware Brightness Dimmer Overlay
    if (typeof steps.brightnessPercent === 'number') {
      this.setScreenBrightness(steps.brightnessPercent);
    }

    // 3. Do Not Disturb Mode
    if (steps.enableDnd !== undefined) {
      this.setDndMode(Boolean(steps.enableDnd));
    }

    // 4. Alarm / Tasks Notification
    if (steps.alarmTime) {
      this.callbacks.onTasksUpdated?.();
      if (this.isMobile()) {
        try {
          const match = steps.alarmTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
          if (match) {
            let hour = parseInt(match[1], 10);
            const min = parseInt(match[2], 10);
            const period = match[3]?.toUpperCase();
            if (period === 'PM' && hour < 12) hour += 12;
            if (period === 'AM' && hour === 12) hour = 0;
            const intentUri = `intent:#Intent;action=android.intent.action.SET_ALARM;i.android.intent.extra.alarm.HOUR=${hour};i.android.intent.extra.alarm.MINUTES=${min};B.android.intent.extra.alarm.SKIP_UI=true;end`;
            window.location.href = intentUri;
          }
        } catch {
          //
        }
      }
    }

    this.callbacks.onShowToast?.(`Routine "${routineName || 'Device Macro'}" activated`);
    return { success: true, message: `Routine executed: ${routineName}` };
  }

  public setEyeComfortShield(enable: boolean) {
    if (typeof document === 'undefined') return;
    let shieldEl = document.getElementById('jarvis-eye-comfort-overlay');
    if (enable) {
      if (!shieldEl) {
        shieldEl = document.createElement('div');
        shieldEl.id = 'jarvis-eye-comfort-overlay';
        shieldEl.style.cssText =
          'position:fixed;inset:0;pointer-events:none;z-index:99998;background:rgba(255,147,41,0.16);mix-blend-mode:multiply;transition:opacity 0.4s ease;';
        document.body.appendChild(shieldEl);
      }
      shieldEl.style.opacity = '1';
      document.documentElement.style.filter = 'sepia(24%) saturate(120%) hue-rotate(-10deg)';
    } else {
      if (shieldEl) shieldEl.style.opacity = '0';
      document.documentElement.style.filter = 'none';
    }
  }

  public setScreenBrightness(percent: number) {
    if (typeof document === 'undefined') return;
    const clamped = Math.max(5, Math.min(100, percent));
    let dimmerEl = document.getElementById('jarvis-screen-dimmer-overlay');
    if (!dimmerEl) {
      dimmerEl = document.createElement('div');
      dimmerEl.id = 'jarvis-screen-dimmer-overlay';
      dimmerEl.style.cssText =
        'position:fixed;inset:0;pointer-events:none;z-index:99997;background:#000000;transition:opacity 0.3s ease;';
      document.body.appendChild(dimmerEl);
    }
    const opacity = ((100 - clamped) / 100) * 0.75;
    dimmerEl.style.opacity = `${opacity}`;
  }

  public setDndMode(enable: boolean) {
    try {
      localStorage.setItem('jarvis_dnd_active', enable ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('jarvis-dnd-change', { detail: enable }));
    } catch {
      //
    }
    this.callbacks.onShowToast?.(`Do Not Disturb ${enable ? 'ENGAGED' : 'DISENGAGED'}`);
  }

  // 10. DIAGNOSE_AND_OPEN_SETTING
  public handleDiagnoseAndOpenSetting(payload: Record<string, any>): { success: boolean; message: string } {
    const { diagnosedSettingName, windowsSettingsUri, androidIntentUri } = payload;
    const isMobile = this.isMobile();

    if (isMobile && androidIntentUri) {
      const intentUrl = `intent:#Intent;action=${androidIntentUri};end`;
      try {
        window.location.href = intentUrl;
      } catch {
        //
      }
    } else if (windowsSettingsUri && typeof window !== 'undefined') {
      // Trigger via API endpoint so backend launches ms-settings safely
      api.openSettingUri(windowsSettingsUri).catch(console.warn);
    }

    this.callbacks.onShowToast?.(`Diagnosed setting: ${diagnosedSettingName || 'System Setting'}`);
    return { success: true, message: `Opened setting for ${diagnosedSettingName}` };
  }

  // 11. CAPTURE_AND_ANALYZE_SCREEN
  public async handleCaptureAndAnalyzeScreen(payload: Record<string, any>): Promise<{ success: boolean; message: string }> {
    try {
      const source = payload.source === 'camera' ? 'camera' : 'screen';
      const focusQuestion = payload.focusQuestion || 'Analyze visible content in this frame';

      this.callbacks.onShowToast?.(`Initiating ${source} visual frame capture...`);

      const frame = source === 'camera'
        ? await visionCapture.captureCameraFrame()
        : await visionCapture.captureScreenFrame();

      this.callbacks.onShowToast?.(`Neural analyzing ${source} frame...`);

      const result = await api.analyzeVision(
        frame.imageBase64,
        frame.imageMimeType,
        source,
        focusQuestion
      );

      if (result.success && result.analysis) {
        speechEngine.speakStreamChunk(result.analysis);
        this.callbacks.onShowToast?.('Visual analysis complete');
        return { success: true, message: result.analysis };
      }

      return { success: false, message: result.error || 'Visual analysis failed' };
    } catch (err: any) {
      console.warn('[ACTION_EXECUTOR] Screen/camera capture failed:', err);
      return { success: false, message: err.message || 'Frame capture rejected' };
    }
  }
}

export const actionExecutor = new JarvisActionExecutor();

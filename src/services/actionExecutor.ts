import { ClientAction } from '../types/jarvis';

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
}

export const actionExecutor = new JarvisActionExecutor();

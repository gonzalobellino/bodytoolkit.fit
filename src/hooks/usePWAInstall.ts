import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaDebugInfo {
  isSecureContext: boolean;
  displayMode: string;
  hasServiceWorker: boolean;
  hasController: boolean;
  hasDeferredPrompt: boolean;
  userAgent: string;
  registrationScope: string;
  activeState: string;
  installingState: string;
  waitingState: string;
  controllerState: string;
  swScriptStatus: string;
  swScriptContentType: string;
  swScriptOk: boolean;
  swScriptError: string;
  swRegisterStatus: string;
  swRegisterScope: string;
  swRegisterScriptUrl: string;
  swRegisterError: string;
}

type WindowWithPwa = Window & {
  __pwaDeferredPrompt?: BeforeInstallPromptEvent | null;
  __pwaSwInfo?: {
    status?: string;
    scope?: string;
    scriptURL?: string;
    error?: string;
  };
  navigator: Navigator & { standalone?: boolean };
};

const getStoredPrompt = (): BeforeInstallPromptEvent | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  return (window as WindowWithPwa).__pwaDeferredPrompt ?? null;
};

const getDisplayMode = () => {
  if (typeof window === 'undefined') {
    return 'unknown';
  }
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return 'standalone';
  }
  if (window.matchMedia('(display-mode: fullscreen)').matches) {
    return 'fullscreen';
  }
  if (window.matchMedia('(display-mode: minimal-ui)').matches) {
    return 'minimal-ui';
  }
  return 'browser';
};

const computeDebugInfo = (hasDeferredPrompt: boolean): PwaDebugInfo => {
  if (typeof window === 'undefined') {
    return {
      isSecureContext: false,
      displayMode: 'unknown',
      hasServiceWorker: false,
      hasController: false,
      hasDeferredPrompt,
      userAgent: '',
      registrationScope: 'unknown',
      activeState: 'unknown',
      installingState: 'unknown',
      waitingState: 'unknown',
      controllerState: 'unknown',
      swScriptStatus: 'unknown',
      swScriptContentType: 'unknown',
      swScriptOk: false,
      swScriptError: '',
      swRegisterStatus: 'unknown',
      swRegisterScope: 'unknown',
      swRegisterScriptUrl: 'unknown',
      swRegisterError: '',
    };
  }

  const swInfo = (window as WindowWithPwa).__pwaSwInfo;

  return {
    isSecureContext: window.isSecureContext,
    displayMode: getDisplayMode(),
    hasServiceWorker: 'serviceWorker' in navigator,
    hasController: !!navigator.serviceWorker?.controller,
    hasDeferredPrompt,
    userAgent: navigator.userAgent,
    registrationScope: 'unknown',
    activeState: 'unknown',
    installingState: 'unknown',
    waitingState: 'unknown',
    controllerState: navigator.serviceWorker?.controller?.state ?? 'none',
    swScriptStatus: 'unknown',
    swScriptContentType: 'unknown',
    swScriptOk: false,
    swScriptError: '',
    swRegisterStatus: swInfo?.status ?? 'unknown',
    swRegisterScope: swInfo?.scope ?? 'unknown',
    swRegisterScriptUrl: swInfo?.scriptURL ?? 'unknown',
    swRegisterError: swInfo?.error ?? '',
  };
};

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [showInstallNotice, setShowInstallNotice] = useState(false);
  const [debugInfo, setDebugInfo] = useState<PwaDebugInfo>(() => computeDebugInfo(!!getStoredPrompt()));

  const triggerInstallNotice = () => {
    setShowInstallNotice(true);
  };

  const refreshDebugInfo = async (promptOverride?: boolean) => {
    const baseInfo = computeDebugInfo(promptOverride ?? !!getStoredPrompt());
    if (!('serviceWorker' in navigator)) {
      setDebugInfo(baseInfo);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const activeState = registration?.active?.state ?? 'none';
      const installingState = registration?.installing?.state ?? 'none';
      const waitingState = registration?.waiting?.state ?? 'none';
      const scope = registration?.scope ?? 'none';
      const controllerState = navigator.serviceWorker?.controller?.state ?? 'none';

      let swScriptStatus = 'unknown';
      let swScriptContentType = 'unknown';
      let swScriptOk = false;
      let swScriptError = '';
      try {
        const response = await fetch('/service-worker.js', { cache: 'no-store' });
        swScriptStatus = `${response.status}`;
        swScriptContentType = response.headers.get('content-type') ?? 'unknown';
        swScriptOk = response.ok;
      } catch (error) {
        swScriptError = String(error);
      }

      setDebugInfo({
        ...baseInfo,
        registrationScope: scope,
        activeState,
        installingState,
        waitingState,
        controllerState,
        swScriptStatus,
        swScriptContentType,
        swScriptOk,
        swScriptError,
      });
    } catch {
      setDebugInfo(baseInfo);
    }
  };

  const unregisterServiceWorkers = async () => {
    if (!('serviceWorker' in navigator)) {
      return;
    }
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
    } catch (error) {
      console.warn('Failed to unregister service workers:', error);
    } finally {
      window.location.reload();
    }
  };

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    const android = /android/.test(userAgent);
    setIsIos(ios);
    setIsAndroid(android);

    // Check if app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window as WindowWithPwa).navigator.standalone;
    if (isStandalone) {
      setIsInstalled(true);
      setIsInstallable(false);
      return;
    }

    const storedPrompt = getStoredPrompt();
    if (storedPrompt) {
      setDeferredPrompt(storedPrompt);
      setIsInstallable(true);
      triggerInstallNotice();
      refreshDebugInfo(true);
    }

    const handleDeferredPrompt = () => {
      const promptEvent = getStoredPrompt();
      if (promptEvent) {
        setDeferredPrompt(promptEvent);
        setIsInstallable(true);
        triggerInstallNotice();
        refreshDebugInfo(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      setShowInstallNotice(false);
      refreshDebugInfo(false);
    };

    const handleVisibility = () => refreshDebugInfo();

    window.addEventListener('pwa:deferredprompt', handleDeferredPrompt);
    window.addEventListener('pwa:appinstalled', handleAppInstalled);
    window.addEventListener('pwa:swstatus', handleVisibility);
    if (ios && !storedPrompt) {
      setIsInstallable(true);
      triggerInstallNotice();
    }
    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      window.removeEventListener('pwa:deferredprompt', handleDeferredPrompt);
      window.removeEventListener('pwa:appinstalled', handleAppInstalled);
      window.removeEventListener('pwa:swstatus', handleVisibility);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      if (isIos) {
        window.alert('To install this app on iOS, tap Share and choose "Add to Home Screen".');
      } else if (isAndroid) {
        window.alert('To install on Android, open the browser menu and tap "Install app" or "Add to Home screen".');
      }
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstallable(false);
        setDeferredPrompt(null);
        setShowInstallNotice(false);
        refreshDebugInfo(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error showing install prompt:', error);
      return false;
    }
  };

  return {
    isInstallable,
    isInstalled,
    promptInstall,
    installLabel: isIos ? 'Add to Home Screen' : 'Install App',
    showInstallNotice,
    dismissInstallNotice: () => setShowInstallNotice(false),
    debugInfo,
    refreshDebugInfo,
    unregisterServiceWorkers
  };
}

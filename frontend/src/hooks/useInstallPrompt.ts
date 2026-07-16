/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPwaInstallModal, setShowPwaInstallModal] = useState(false);

  const isRunningStandalone = useMemo(() => {
    return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
  }, []);

  const [showInstallBtn, setShowInstallBtn] = useState(!isRunningStandalone);

  useEffect(() => {
    if (window.deferredPrompt) {
      setDeferredPrompt(window.deferredPrompt);
      setShowInstallBtn(true);
    }

    const handleAppInstallable = () => {
      setDeferredPrompt(window.deferredPrompt);
      setShowInstallBtn(true);
    };

    window.addEventListener('app-installable', handleAppInstallable);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      window.deferredPrompt = e;
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('app-installable', handleAppInstallable);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA install prompt choice: ${outcome}`);
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    } else {
      setShowPwaInstallModal(true);
    }
  };

  return {
    showInstallBtn,
    showPwaInstallModal,
    setShowPwaInstallModal,
    handleInstallApp
  };
}

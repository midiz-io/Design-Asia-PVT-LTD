// PWA Service Worker Registration and Management
export class PWAManager {
  private static instance: PWAManager;
  private registration: ServiceWorkerRegistration | null = null;
  private deferredPrompt: any = null;

  private constructor() {}

  public static getInstance(): PWAManager {
    if (!PWAManager.instance) {
      PWAManager.instance = new PWAManager();
    }
    return PWAManager.instance;
  }

  public async init() {
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully:', this.registration);

        // Listen for updates
        this.registration.addEventListener('updatefound', () => {
          const newWorker = this.registration?.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available, show update notification
                this.showUpdateNotification();
              }
            });
          }
        });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }

    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallPrompt();
    });

    // Listen for appinstalled event
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      this.hideInstallPrompt();
    });
  }

  public async installApp(): Promise<boolean> {
    if (!this.deferredPrompt) {
      return false;
    }

    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        this.hideInstallPrompt();
        return true;
      } else {
        console.log('User dismissed the install prompt');
        return false;
      }
    } catch (error) {
      console.error('Error during app installation:', error);
      return false;
    }
  }

  public isInstallable(): boolean {
    return this.deferredPrompt !== null;
  }

  public isInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
  }

  public get isSupported(): boolean {
    return 'serviceWorker' in navigator && (window.isSecureContext || window.location.hostname === 'localhost');
  }

  public async updateApp(): Promise<void> {
    if (this.registration?.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }

  public async checkForUpdates(): Promise<boolean> {
    if (!this.registration) return false;

    try {
      await this.registration.update();
      return this.registration.waiting !== null;
    } catch (error) {
      console.error('Error checking for updates:', error);
      return false;
    }
  }

  public async getVersion(): Promise<string> {
    if (!this.registration?.active) return 'unknown';

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.version || 'unknown');
      };
      this.registration?.active?.postMessage(
        { type: 'GET_VERSION' },
        [messageChannel.port2]
      );
    });
  }

  /**
   * Simple helper to log core web-vital style metrics.
   * Call this from manual testing sessions if you want numbers in the console.
   */
  public logBasicPerformanceMetrics() {
    if (typeof performance === 'undefined' || !performance.getEntriesByType) return;

    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const nav = navEntries[0];
    if (!nav) return;

    const metrics = {
      timeToFirstByte: nav.responseStart,
      domContentLoaded: nav.domContentLoadedEventEnd,
      firstPaint: (performance.getEntriesByName('first-paint')[0] as any)?.startTime ?? null,
      firstContentfulPaint: (performance.getEntriesByName('first-contentful-paint')[0] as any)?.startTime ?? null,
      loadEventEnd: nav.loadEventEnd,
      transferSize: (nav as any).transferSize ?? null,
    };

    console.table(metrics);
  }

  private showInstallPrompt() {
    // Create install prompt UI
    const installBanner = document.createElement('div');
    installBanner.id = 'pwa-install-banner';
    installBanner.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        left: 20px;
        right: 20px;
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: white;
        padding: 16px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
      ">
        <div style="flex: 1;">
          <div style="font-weight: 600; margin-bottom: 4px;">Install TaskVision</div>
          <div style="opacity: 0.9; font-size: 13px;">Add to home screen for quick access</div>
        </div>
        <button id="pwa-install-btn" style="
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        ">Install</button>
        <button id="pwa-dismiss-btn" style="
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          font-size: 18px;
          cursor: pointer;
          padding: 4px;
          line-height: 1;
        ">×</button>
      </div>
    `;

    const anchor = document.getElementById('pwa-install-anchor');
    if (anchor) {
      anchor.classList.remove('hidden');
      anchor.appendChild(installBanner);
    } else {
      document.body.appendChild(installBanner);
    }

    // Add event listeners
    document.getElementById('pwa-install-btn')?.addEventListener('click', () => {
      this.installApp();
    });

    document.getElementById('pwa-dismiss-btn')?.addEventListener('click', () => {
      this.hideInstallPrompt();
    });
  }

  private hideInstallPrompt() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
      banner.remove();
    }
    const anchor = document.getElementById('pwa-install-anchor');
    if (anchor) {
      anchor.classList.add('hidden');
    }
  }

  private showUpdateNotification() {
    // Create update notification UI
    const updateBanner = document.createElement('div');
    updateBanner.id = 'pwa-update-banner';
    updateBanner.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        left: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 16px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
      ">
        <div style="flex: 1;">
          <div style="font-weight: 600; margin-bottom: 4px;">Update Available</div>
          <div style="opacity: 0.9; font-size: 13px;">A new version is ready to install</div>
        </div>
        <button id="pwa-update-btn" style="
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        ">Update</button>
        <button id="pwa-update-dismiss-btn" style="
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          font-size: 18px;
          cursor: pointer;
          padding: 4px;
          line-height: 1;
        ">×</button>
      </div>
    `;

    document.body.appendChild(updateBanner);

    // Add event listeners
    document.getElementById('pwa-update-btn')?.addEventListener('click', () => {
      this.updateApp();
    });

    document.getElementById('pwa-update-dismiss-btn')?.addEventListener('click', () => {
      this.hideUpdateNotification();
    });
  }

  private hideUpdateNotification() {
    const banner = document.getElementById('pwa-update-banner');
    if (banner) {
      banner.remove();
    }
  }

}

// Export singleton instance
export const pwaManager = PWAManager.getInstance();

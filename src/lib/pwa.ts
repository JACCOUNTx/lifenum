import { Capacitor } from '@capacitor/core';

type UpdateListener = (ready: boolean) => void;

let registration: ServiceWorkerRegistration | null = null;
let waiting: ServiceWorker | null = null;
let reloading = false;
const listeners = new Set<UpdateListener>();

function notify() {
  for (const listener of listeners) listener(waiting !== null);
}

/** Subscribe to "a new version has been downloaded and is ready to use". */
export function onUpdateAvailable(listener: UpdateListener): () => void {
  listeners.add(listener);
  listener(waiting !== null);
  return () => {
    listeners.delete(listener);
  };
}

export function applyUpdate(): void {
  if (!waiting) {
    window.location.reload();
    return;
  }
  reloading = true;
  waiting.postMessage({ type: 'SKIP_WAITING' });
}

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator) || Capacitor.isNativePlatform()) return;

  window.addEventListener('load', () => {
    void register();
  });
}

async function register() {
  try {
    registration = await navigator.serviceWorker.register('./sw.js');

    if (registration.waiting && navigator.serviceWorker.controller) {
      waiting = registration.waiting;
      notify();
    }

    registration.addEventListener('updatefound', () => {
      const installing = registration?.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        if (installing.state !== 'installed' || !navigator.serviceWorker.controller) return;
        waiting = installing;
        notify();
      });
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!reloading) return;
      reloading = false;
      window.location.reload();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void registration?.update();
    });
  } catch {
    // Offline caching is a bonus; the app still runs without it.
  }
}

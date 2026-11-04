// Service Worker for TaskVision PWA
// Provides offline-first shell, runtime caching, background sync and push notifications.

const CACHE_VERSION = 'v3';
const SHELL_CACHE = `taskvision-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `taskvision-runtime-${CACHE_VERSION}`;

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
];

// Install event - pre-cache minimal shell
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('taskvision-') && key !== SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Helper: network-first for navigation requests with offline fallback
async function handleNavigationRequest(event) {
  try {
    const networkResponse = await fetch(event.request);
    const responseClone = networkResponse.clone();
    const cache = await caches.open(SHELL_CACHE);
    cache.put(event.request, responseClone);
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(SHELL_CACHE);
    const cached = await cache.match(event.request);
    if (cached) return cached;
    const offline = await cache.match('/offline.html');
    return offline || new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

// Helper: stale-while-revalidate for static assets
async function handleAssetRequest(event) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(event.request);
  const networkPromise = fetch(event.request)
    .then((response) => {
      if (response && response.status === 200) {
        const responseClone = response.clone();
        cache.put(event.request, responseClone);
      }
      return response;
    })
    .catch(() => cached);

  return cached || networkPromise;
}

// Fetch event - offline-aware routing
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Ignore non-HTTP(s) and analytics requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle navigation requests (SPA shell)
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(event));
    return;
  }

  // Static assets: JS, CSS, images, fonts
  if (/\.(?:js|css|png|jpg|jpeg|gif|svg|webp|ico|ttf|woff2?)$/i.test(url.pathname)) {
    event.respondWith(handleAssetRequest(event));
    return;
  }

  // Fallback: network first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseClone));
        }
        return response;
      })
      .catch(async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(request);
        return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered');
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle any pending offline actions here
      handleBackgroundSync()
    );
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  let notificationData = {
    title: 'TaskVision',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
      url: '/dashboard'
    }
  };

  // Parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = {
        ...notificationData,
        ...pushData,
        data: {
          ...notificationData.data,
          ...pushData.data
        }
      };
    } catch (e) {
      // Fallback to text if JSON parsing fails
      notificationData.body = event.data.text();
    }
  }

  // Role-based notification styling
  const roleColors = {
    admin: '#dc2626',      // red
    manager: '#ea580c',    // orange
    supervisor: '#d97706', // amber
    employee: '#16a34a'    // green
  };

  const role = notificationData.data?.role || 'employee';
  const themeColor = roleColors[role] || roleColors.employee;

  const options = {
    body: notificationData.body,
    icon: notificationData.icon || '/icons/icon-192x192.png',
    badge: notificationData.badge || '/icons/icon-72x72.png',
    image: notificationData.image,
    vibrate: [100, 50, 100],
    data: notificationData.data,
    tag: notificationData.data?.notificationId || 'default',
    renotify: true,
    requireInteraction: notificationData.data?.requireInteraction || false,
    silent: notificationData.data?.silent || false,
    timestamp: Date.now(),
    actions: [
      {
        action: 'view',
        title: 'View Details',
        icon: '/icons/action-view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/action-close.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();

  const notificationData = event.notification.data;
  const targetUrl = notificationData?.url || '/dashboard';

  if (event.action === 'view') {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        // Open new window if app is not open
        return clients.openWindow(targetUrl);
      })
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            return;
          }
        }
        // Open new window if app is not open
        return clients.openWindow(targetUrl);
      })
    );
  }
});

// Handle background sync
async function handleBackgroundSync() {
  try {
    // Get pending offline actions from IndexedDB
    const pendingActions = await getPendingActions();
    
    for (const action of pendingActions) {
      try {
        await syncAction(action);
        await removePendingAction(action.id);
      } catch (error) {
        console.error('Service Worker: Failed to sync action:', error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Background sync failed:', error);
  }
}

// Helper functions for offline data management
async function getPendingActions() {
  // This would typically interact with IndexedDB
  // For now, return empty array
  return [];
}

async function syncAction(action) {
  // This would sync the action with the server
  // Implementation depends on your specific needs
  console.log('Service Worker: Syncing action:', action);
}

async function removePendingAction(actionId) {
  // This would remove the action from IndexedDB
  console.log('Service Worker: Removing pending action:', actionId);
}

// Message handler for communication with the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: '1.0.1' });
  }
});

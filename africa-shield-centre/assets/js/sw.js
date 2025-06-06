// Service Worker for SOC Dashboard
const CACHE_NAME = 'soc-dashboard-v1.0.0';
const urlsToCache = [
    '/',
    '/SOC/index.html',
    '/assets/css/main.css',
    '/assets/css/soc-dashboard.css',
    '/assets/css/soc-animations.css',
    '/assets/js/main.js',
    '/assets/js/soc-dashboard.js',
    '/assets/images/logo.png',
    '/assets/images/favicon.ico',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js'
];

// Install event
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Fetch event
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                if (response) {
                    return response;
                }
                return fetch(event.request);
            }
        )
    );
});

// Activate event
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Background sync for offline data
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    try {
        // Sync offline data when connection is restored
        console.log('Background sync triggered');
        
        // Send queued threat reports
        const queuedReports = await getQueuedReports();
        for (const report of queuedReports) {
            await sendThreatReport(report);
        }
        
        // Update threat intelligence
        await updateThreatIntelligence();
        
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

async function getQueuedReports() {
    // Get reports stored in IndexedDB while offline
    return [];
}

async function sendThreatReport(report) {
    // Send threat report to server
    console.log('Sending threat report:', report);
}

async function updateThreatIntelligence() {
    // Update threat intelligence data
    console.log('Updating threat intelligence');
}

// Push notifications
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'New security alert',
        icon: '/assets/images/logo.png',
        badge: '/assets/images/badge.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'View Details',
                icon: '/assets/images/checkmark.png'
            },
            {
                action: 'close',
                title: 'Dismiss',
                icon: '/assets/images/xmark.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('SOC Alert', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'explore') {
        // Open SOC dashboard
        event.waitUntil(
            clients.openWindow('/SOC/index.html')
        );
    } else if (event.action === 'close') {
        // Just close the notification
        return;
    } else {
        // Default action - open dashboard
        event.waitUntil(
            clients.openWindow('/SOC/index.html')
        );
    }
});
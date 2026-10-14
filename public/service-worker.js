// Service Worker for PWA - Corrective Exercise Toolkit (React)
const CACHE_NAME = 'corrective-toolkit-react-v5';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    // Data files
    '/data/patterns.json',
    '/data/conditions.json',
    '/data/exercises.json',
    '/data/assessments.json',
    '/data/glossary.json',
    '/data/clinical-cases.json',
    '/data/client-questionnaire.json',
    '/data/physical-activity-readiness.json',
    '/data/lefs.json',
    '/data/uefi.json',
    '/data/muscleCharts.json',
    '/data/quizTopics.json',
    '/data/movement-analysis-goblet-squat.json',
    '/data/movement-analysis-lower-body.json',
    '/data/movement-analysis-upper-body.json',
    '/data/movement-analysis-shoulder-press.json',
    '/data/movement-analysis-single-joint.json',
    // Icons
    '/icon-192.png',
    '/icon-512.png',
    '/favicon.svg',
    '/apple-touch-icon.png',
    // Vite build assets will be cached dynamically
];

// Install - cache resources
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Cache opened:', CACHE_NAME);
                // Cache only files (not directories)
                const filesToCache = urlsToCache.filter(url => !url.endsWith('/'));
                return cache.addAll(filesToCache).catch(err => {
                    console.warn('[SW] Some files failed to cache during install:', err);
                    // Continue even if some files fail - they'll be cached on first request
                });
            })
            .then(() => {
                console.log('[SW] Installation complete');
            })
            .catch(err => console.error('[SW] Error during installation:', err))
    );
    self.skipWaiting(); // Activate immediately
});

// Activate - clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[SW] Activation complete');
            return self.clients.claim(); // Take control of all pages immediately
        })
    );
});

// Helper: Check if this is a Vite dev server request (not production)
function isDevServer(url) {
    return url.includes('localhost') ||
           url.includes('127.0.0.1') ||
           url.includes(':5173') ||
           url.includes(':5174');
    // NOTE: umbrel.local is PRODUCTION, not dev server
    // We want to cache everything in production (umbrel.local)
}

// Helper: Check if a request should be cached
function shouldCache(request) {
    const url = new URL(request.url);
    
    // Skip service worker itself
    if (url.pathname === '/service-worker.js') {
        return false;
    }
    
    // Always cache data files
    if (url.pathname.startsWith('/data/') && url.pathname.endsWith('.json')) {
        return true;
    }
    
    // Cache Vite build assets (JS, CSS, etc.)
    if (url.pathname.startsWith('/assets/')) {
        return true;
    }
    
    // Cache scripts and styles (by destination)
    if (request.destination === 'script' || request.destination === 'style') {
        return true;
    }
    
    // Cache by file extension as fallback (destination might be empty)
    if (url.pathname.endsWith('.js') || 
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.mjs')) {
        return true;
    }
    
    // Cache HTML
    if (request.destination === 'document' || url.pathname.endsWith('.html')) {
        return true;
    }
    
    // Cache images
    if (request.destination === 'image' ||
        url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i)) {
        return true;
    }
    
    // Cache manifest and icons
    if (url.pathname === '/manifest.json' || 
        url.pathname.includes('icon-') || 
        url.pathname.includes('favicon') ||
        url.pathname.includes('apple-touch-icon')) {
        return true;
    }
    
    // Cache root path and index
    if (url.pathname === '/' || url.pathname === '/index.html') {
        return true;
    }
    
    return false;
}

function shouldUseNetworkFirst(request) {
    const url = new URL(request.url);

    return request.destination === 'document' ||
        request.destination === 'script' ||
        request.destination === 'style' ||
        url.pathname === '/' ||
        url.pathname === '/index.html' ||
        url.pathname.startsWith('/assets/') ||
        url.pathname.endsWith('.html') ||
        url.pathname.endsWith('.js') ||
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.mjs');
}

async function cacheResponse(request, response, requestUrl) {
    if (!response || response.status !== 200 || response.type !== 'basic' || !shouldCache(request)) {
        return;
    }

    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone()).catch(err => {
        console.warn('[SW] Failed to cache:', requestUrl.pathname, err);
    });

    if (requestUrl.search) {
        const requestWithoutQuery = new Request(requestUrl.pathname, {
            method: request.method,
            headers: request.headers,
            mode: request.mode,
            credentials: request.credentials,
            redirect: request.redirect
        });
        cache.put(requestWithoutQuery, response.clone()).catch(err => {
            console.warn('[SW] Failed to cache without query params:', requestUrl.pathname, err);
        });
    }
}

async function matchCachedRequest(request, requestUrl) {
    let cachedResponse = await caches.match(request, {
        ignoreSearch: false,
    });

    if (cachedResponse) {
        console.log('[SW] Serving from cache (exact match):', requestUrl.pathname);
        return cachedResponse;
    }

    if (requestUrl.search) {
        cachedResponse = await caches.match(request, {
            ignoreSearch: true,
        });

        if (cachedResponse) {
            console.log('[SW] Serving from cache (ignoring query params):', requestUrl.pathname);
            return cachedResponse;
        }
    }

    return null;
}

// Fetch - Network First for app shell/build assets, Cache First for static offline resources
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip chrome-extension and other non-http requests
    if (!event.request.url.startsWith('http')) return;

    const requestUrl = new URL(event.request.url);

    // Don't handle cross-origin requests (fonts, analytics, extensions, etc.)
    if (requestUrl.origin !== self.location.origin) return;

    // Work around a known browser edge case
    if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') return;

    // In development (Vite dev server only), skip service worker for dynamic JSON with cache-busting
    // This allows hot reload to work properly during development
    // NOTE: umbrel.local is PRODUCTION, so we cache everything there
    if (isDevServer(event.request.url) && 
        event.request.url.includes('/data/') && 
        event.request.url.endsWith('.json') &&
        event.request.url.includes('?t=')) {
        // Skip cache-busting requests during dev (they have timestamp query params)
        return;
    }

    event.respondWith(
        (async () => {
            try {
                if (shouldUseNetworkFirst(event.request)) {
                    try {
                        console.log('[SW] Fetching from network first:', requestUrl.pathname);
                        const fetchResponse = await fetch(event.request);
                        await cacheResponse(event.request, fetchResponse.clone(), requestUrl);
                        return fetchResponse;
                    } catch (fetchError) {
                        console.warn('[SW] Network-first fetch failed:', requestUrl.pathname, fetchError);
                        const cachedResponse = await matchCachedRequest(event.request, requestUrl);
                        if (cachedResponse) return cachedResponse;
                        throw fetchError;
                    }
                }

                // Strategy: Cache First (better for offline)
                // Try cache first - exact match
                let cachedResponse = await matchCachedRequest(event.request, requestUrl);

                if (cachedResponse) {
                    return cachedResponse;
                }

                // If not in cache, try network
                try {
                    console.log('[SW] Fetching from network:', requestUrl.pathname);
                    const fetchResponse = await fetch(event.request);
                    
                    await cacheResponse(event.request, fetchResponse.clone(), requestUrl);

                    return fetchResponse;
                } catch (fetchError) {
                    console.warn('[SW] Network fetch failed:', requestUrl.pathname, fetchError);
                    
                    // Network failed - try to serve fallback
                    // For HTML requests, return index.html (SPA fallback)
                    if (event.request.destination === 'document' || 
                        requestUrl.pathname.endsWith('.html')) {
                        const offlinePage = await caches.match('/index.html', { ignoreSearch: true });
                        if (offlinePage) {
                            console.log('[SW] Serving offline page');
                            return offlinePage;
                        }
                    }
                    
                    // For other requests, try to find a similar cached resource
                    // Try matching without query parameters
                    if (requestUrl.search) {
                        const fallbackResponse = await caches.match(event.request, { ignoreSearch: true });
                        if (fallbackResponse) {
                            console.log('[SW] Serving fallback from cache (ignoring query):', requestUrl.pathname);
                            return fallbackResponse;
                        }
                    }
                    
                    // Last attempt: search all cached requests by pathname
                    const cache = await caches.open(CACHE_NAME);
                    const allCached = await cache.keys();
                    const similarCache = allCached.find(cachedRequest => {
                        const cachedUrl = new URL(cachedRequest.url);
                        return cachedUrl.pathname === requestUrl.pathname;
                    });
                    
                    if (similarCache) {
                        const fallbackResponse = await caches.match(similarCache);
                        if (fallbackResponse) {
                            console.log('[SW] Serving fallback from cache (pathname match):', requestUrl.pathname);
                            return fallbackResponse;
                        }
                    }
                    
                    // Return a proper error response
                    return new Response('Offline - Resource not available', { 
                        status: 503, 
                        statusText: 'Service Unavailable',
                        headers: { 
                            'Content-Type': 'text/plain',
                            'Cache-Control': 'no-cache'
                        }
                    });
                }
            } catch (error) {
                console.error('[SW] Unexpected error:', error);
                
                // Last resort: try to serve index.html for document requests
                if (event.request.destination === 'document') {
                    const offlinePage = await caches.match('/index.html', { ignoreSearch: true });
                    if (offlinePage) {
                        return offlinePage;
                    }
                }
                
                return new Response('Service Unavailable', { 
                    status: 503, 
                    statusText: 'Service Unavailable',
                    headers: { 'Content-Type': 'text/plain' }
                });
            }
        })()
    );
});

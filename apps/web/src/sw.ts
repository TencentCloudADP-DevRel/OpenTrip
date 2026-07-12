/// <reference lib="webworker" />

import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, StaleWhileRevalidate } from "workbox-strategies";

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
clientsClaim();

self.addEventListener("message", (event) => {
    if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();
});

const isSafePublicGet = ({ request, url }: { request: Request; url: URL }) =>
    request.method === "GET" &&
    url.protocol === "https:" &&
    !url.pathname.startsWith("/api/");

registerRoute(
    ({ request, url }) =>
        isSafePublicGet({ request, url }) &&
        request.destination === "image" &&
        url.origin !== self.location.origin,
    new StaleWhileRevalidate({
        cacheName: "public-images-v1",
        plugins: [
            new CacheableResponsePlugin({ statuses: [0, 200] }),
            new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 7 * 86_400 }),
        ],
    }),
);

registerRoute(
    ({ request, url }) =>
        isSafePublicGet({ request, url }) &&
        request.destination === "image" &&
        /(^|\.)tile\.openstreetmap\.org$/.test(url.hostname),
    new CacheFirst({
        cacheName: "public-map-tiles-v1",
        plugins: [
            new CacheableResponsePlugin({ statuses: [0, 200] }),
            new ExpirationPlugin({ maxEntries: 180, maxAgeSeconds: 3 * 86_400 }),
        ],
    }),
);

// Business data, authentication, mutations, uploads, streams, and realtime
// traffic deliberately remain network-only. IndexedDB owns offline trip data.

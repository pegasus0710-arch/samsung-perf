// ── 충청영업팀 실적관리 시스템 Service Worker ──
const CACHE_NAME = "cst-v3";

// 캐시할 정적 파일 (CDN 라이브러리는 제외 — 네트워크 우선)
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./plan.html",
  "./style.css",
  "./app.js",
  "./plan.js",
  "./manifest.json",
  "./icon_192.png",
  "./icon_180.png"
];

// ── 설치: 정적 파일 캐시
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // 개별 실패해도 설치 계속 (아이콘 없을 수 있으므로)
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(() => {}))
      );
    })
  );
  self.skipWaiting();
});

// ── 활성화: 이전 캐시 제거
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── 요청 처리 전략
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Firebase / CDN / 외부 요청 → 항상 네트워크 우선 (캐시 없음)
  const isExternal =
    url.hostname !== self.location.hostname ||
    url.hostname.includes("firebaseio.com") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("gstatic.com") ||
    url.hostname.includes("cdnjs.cloudflare.com");

  if (isExternal) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 앱 파일 → Network First (최신 버전 우선, 실패 시 캐시 fallback)
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

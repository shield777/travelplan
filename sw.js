/* 오프라인 지원: 항상 네트워크를 먼저 쓰고, 연결이 없을 때만 저장해 둔 사본을 보여 줘요.
   (그래서 앱을 고쳐 올리면 다음 접속 때 바로 새 버전이 보입니다) */
const CACHE = 'travelplan-v17';
const SHELL = ['./', 'index.html', 'css/style.css', 'js/airports.js', 'js/app.js', 'manifest.webmanifest', 'icons/icon-192.png', 'vendor/html2pdf.bundle.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});

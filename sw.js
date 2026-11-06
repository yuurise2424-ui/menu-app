const CACHE_NAME = 'menu-v8';
const VIDEO_CACHE = 'menu-videos'; // index.html の precacheVideos が中身を管理する（ここでは消さないだけ）
const PRECACHE = ['./index.html', './manifest.json', './quiz_bank.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME && k !== VIDEO_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (!e.request.url.startsWith(self.location.origin)) return;
  // 動画は通信をそのまま通す（保存済みの動画はページ側が端末のデータから再生する）
  if (new URL(e.request.url).pathname.includes('/videos/')) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

const CACHE_NAME = 'menu-v6';
const VIDEO_CACHE = 'menu-videos'; // index.html の precacheVideos が中身を管理する
const PRECACHE = ['./index.html', './manifest.json'];

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
  if (new URL(e.request.url).pathname.includes('/videos/')) {
    e.respondWith(serveVideo(e.request));
    return;
  }
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

// 保存済みの動画は端末から返す。<video> は Range 指定で部分取得してくるので 206 で切り出して返す
async function serveVideo(req) {
  const cache = await caches.open(VIDEO_CACHE);
  const cached = await cache.match(req.url);
  if (!cached) return fetch(req);

  const range = req.headers.get('range');
  if (!range) return cached;

  const blob = await cached.blob();
  const size = blob.size;
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  let start, end;
  if (m && m[1] === '' && m[2] !== '') {
    start = Math.max(size - Number(m[2]), 0);
    end = size - 1;
  } else {
    start = m && m[1] ? Number(m[1]) : 0;
    end = m && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
  }
  if (start >= size) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  }
  return new Response(blob.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': cached.headers.get('Content-Type') || 'video/mp4',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes',
    },
  });
}

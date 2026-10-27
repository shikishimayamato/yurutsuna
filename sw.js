/* ゆるつな香川 v2.8 オリーブの輪 — PWAインストール補助とオフライン案内のみ */
const STATIC_CACHE = 'yurutsuna-static-v2.8-olive4';
const OFFLINE_URL = new URL('./offline.html', self.registration.scope).href;
const ASSETS = ['offline.html','manifest.json','icon-192.png','icon-512.png','icon-maskable-512.png','apple-touch-icon.png']
  .map(path => new URL('./' + path, self.registration.scope).href);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(STATIC_CACHE).then(cache => cache.addAll(ASSETS)));
  // 既存のページを使っている人の途中操作を中断させないため、待機します。
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const all = await caches.keys();
    await Promise.all(all.filter(key => key.startsWith('yurutsuna-static-') && key !== STATIC_CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// Firebaseの認証・イベント・会員情報、および外部通信は一切キャッシュしません。
// ネットワークが無い場合に限り、静的な「接続できません」画面を表示します。
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  if (request.method === 'GET' && url.origin === scope.origin && ASSETS.includes(url.href)) {
    event.respondWith(caches.match(request).then(hit => hit || fetch(request)));
    return;
  }
  if (request.mode !== 'navigate' || request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  event.respondWith(fetch(request).catch(async () =>
    (await caches.match(OFFLINE_URL)) || new Response('インターネットに接続してください。', {status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})
  ));
});

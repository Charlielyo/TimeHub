/* TimeHub - Service Worker (PWA 离线支持) */
/* 版本: 1.1.0
 *
 * 缓存策略（重要）：
 *   - HTML  → 网络优先（network-first）：联网时永远拿最新页面，断网时回退缓存
 *   - CSS/JS → 先用缓存立即渲染，同时在后台拉新版本（stale-while-revalidate）
 *   - 其他静态资源（图标等）→ 缓存优先 + 后台更新
 *
 * 为什么不能全用"缓存优先"：那样 CSS/JS 一旦进缓存就再也不会更新，
 * 改了 bug 用户也看不到，只能等缓存名变化。这是本项目旧版踩过的坑。
 *
 * 发版流程：改完代码后把 VERSION 号加一（下面的常量），
 * 新 SW 装上会清掉旧缓存，用户下次进页面即拿到新资源。
 */

const VERSION = '1.1.0';
const CACHE_NAME = `timehub-v${VERSION}`;
const OFFLINE_URL = 'index.html';

// 预缓存清单：只列**真实存在**的文件。
// 旧版把 CNAME、README.md 和一批空文件也列进来，只要有一个 404，
// cache.addAll() 就会整体失败、离线能力全废——所以这里也改成了逐个添加、互不牵连。
const PRECACHE_RESOURCES = [
  // 页面
  './',
  './index.html',
  './pomodoro.html',
  './stopwatch.html',
  './countdown.html',
  './worldclock.html',
  './deadline.html',
  './breathing.html',
  // 旧地址重定向页
  './multi-timer.html',
  './world-clock.html',

  // 样式
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/dashboard.css',
  './css/breathing.css',

  // 脚本
  './js/common.js',
  './js/utils.js',
  './js/toast.js',
  './js/dashboard.js',
  './js/pomodoro.js',
  './js/breathing.js',

  // 图标与应用清单
  './assets/icons/dashboard.svg',
  './assets/icons/pomodoro.svg',
  './assets/icons/stopwatch.svg',
  './assets/icons/multi-timer.svg',
  './assets/icons/world-clock.svg',
  './assets/icons/deadline.svg',
  './assets/icons/breathing.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png',
  './manifest.json'
];

/* ===== 安装：预缓存 ===== */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      // 逐个添加：单个文件失败不影响其余资源，也不会让整个 SW 安装失败
      Promise.allSettled(
        PRECACHE_RESOURCES.map(url =>
          cache.add(url).catch(err => console.warn('[SW] 预缓存失败（已跳过）:', url, err))
        )
      )
    ).then(() => self.skipWaiting())
  );
});

/* ===== 激活：清理旧版本缓存 ===== */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

/* ===== 请求拦截 ===== */
self.addEventListener('fetch', event => {
  const { request } = event;

  // 只处理同源 GET；其余（POST、跨域、扩展）交回浏览器
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 页面导航 与 HTML：网络优先，断网回退缓存
  if (request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 样式与脚本：缓存优先 + 后台更新（改了代码下次访问即生效，不用等缓存过期）
  if (/\.(css|js)$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // 其他静态资源（图标、图片、清单）：缓存优先，未命中则联网并写入缓存
  event.respondWith(cacheFirst(request));
});

/* 网络优先：联网时始终拿最新的 HTML */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match(OFFLINE_URL);
  }
}

/* 缓存优先 + 后台刷新：先给用户最快的一版，再悄悄更新缓存 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then(response => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) return cached;

  const response = await network;
  return response || new Response('离线且无缓存', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

/* 缓存优先 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return new Response('网络连接失败，请检查网络设置。', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

/* ===== 消息：手动跳过等待 / 清缓存 ===== */
self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME);
  }
});

/* ===== 推送通知 ===== */
self.addEventListener('push', event => {
  const text = event.data ? event.data.text() : 'TimeHub 有新消息';
  event.waitUntil(
    self.registration.showNotification('TimeHub', {
      body: text,
      icon: './assets/icons/icon-192.png',
      badge: './assets/icons/icon-192.png',
      data: { dateOfArrival: Date.now(), primaryKey: 'timehub-notification' },
      actions: [
        { action: 'open', title: '打开应用' },
        { action: 'close', title: '关闭' }
      ]
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'close') return;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.registration.scope));
      return existing ? existing.focus() : clients.openWindow('./');
    })
  );
});

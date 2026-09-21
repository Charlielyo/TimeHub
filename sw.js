/* TimeHub - Service Worker (PWA离线支持) */
/* 版本: 1.0 */

const CACHE_NAME = 'timehub-v1.0';
const OFFLINE_URL = 'index.html';

// 需要缓存的资源列表
const PRECACHE_RESOURCES = [
  // 核心页面
  './',
  './index.html',
  './pomodoro.html',
  './stopwatch.html',
  './countdown.html',
  './worldclock.html',
  './deadline.html',
  './breathing.html',

  // 重定向页面
  './multi-timer.html',
  './world-clock.html',

  // CSS文件
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/dashboard.css',
  './css/pomodoro.css',
  './css/stopwatch.css',
  './css/multi-timer.css',
  './css/world-clock.css',
  './css/deadline.css',
  './css/breathing.css',
  './css/common.css',

  // JavaScript文件
  './js/common.js',
  './js/utils.js',
  './js/toast.js',
  './js/dashboard.js',
  './js/pomodoro.js',
  './js/modules/pomodoro.js',
  './js/stopwatch.js',
  './js/multi-timer.js',
  './js/world-clock.js',
  './js/deadline.js',
  './js/breathing.js',

  // 图标资源
  './assets/icons/dashboard.svg',
  './assets/icons/pomodoro.svg',
  './assets/icons/stopwatch.svg',
  './assets/icons/multi-timer.svg',
  './assets/icons/world-clock.svg',
  './assets/icons/deadline.svg',
  './assets/icons/breathing.svg',

  // 其他文件
  './manifest.json',
  './CNAME',
  './README.md'
];

// 安装事件 - 预缓存资源
self.addEventListener('install', event => {
  console.log('[Service Worker] 安装中...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] 缓存核心文件');
        return cache.addAll(PRECACHE_RESOURCES);
      })
      .then(() => {
        console.log('[Service Worker] 安装完成，跳过等待');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[Service Worker] 安装失败:', error);
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', event => {
  console.log('[Service Worker] 激活中...');

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] 删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] 激活完成，接管所有客户端');
      return self.clients.claim();
    })
  );
});

// 获取事件 - 网络优先，回退缓存
self.addEventListener('fetch', event => {
  // 跳过非GET请求和Chrome扩展请求
  if (event.request.method !== 'GET' ||
      event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  // 处理API请求（如果有的话）
  if (event.request.url.includes('/api/')) {
    // 对于API请求，使用网络优先策略
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // 对于静态资源，使用缓存优先策略
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // 如果有缓存，返回缓存
        if (cachedResponse) {
          // 如果是HTML页面，在后台更新缓存
          if (event.request.url.endsWith('.html') ||
              event.request.url.endsWith('/')) {
            updateCache(event.request);
          }
          return cachedResponse;
        }

        // 否则从网络获取
        return fetch(event.request)
          .then(response => {
            // 检查响应是否有效
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // 克隆响应以用于缓存
            const responseToCache = response.clone();

            // 添加到缓存
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // 网络失败，尝试返回离线页面
            if (event.request.url.endsWith('.html') ||
                event.request.url.endsWith('/')) {
              return caches.match(OFFLINE_URL);
            }

            // 对于其他资源，返回404
            return new Response('网络连接失败，请检查网络设置。', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// 在后台更新缓存
function updateCache(request) {
  caches.open(CACHE_NAME)
    .then(cache => {
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            cache.put(request, response);
          }
        })
        .catch(() => {
          // 网络失败，保持旧缓存
        });
    });
}

// 监听消息事件（可用于更新等）
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME);
  }
});

// 监听推送事件（未来可添加推送通知）
self.addEventListener('push', event => {
  console.log('[Service Worker] 收到推送消息:', event.data.text());

  const options = {
    body: event.data.text() || 'TimeHub有新消息',
    icon: './assets/icons/dashboard.svg',
    badge: './assets/icons/dashboard.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 'timehub-notification'
    },
    actions: [
      {
        action: 'open',
        title: '打开应用'
      },
      {
        action: 'close',
        title: '关闭'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('TimeHub', options)
  );
});

// 处理通知点击
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] 通知被点击:', event.notification.tag);

  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// 处理同步事件（后台同步）
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    console.log('[Service Worker] 后台同步开始');
    // 在这里实现数据同步逻辑
  }
});

// 处理离线状态变化
self.addEventListener('offline', () => {
  console.log('[Service Worker] 设备已离线');
});

self.addEventListener('online', () => {
  console.log('[Service Worker] 设备已在线');
});
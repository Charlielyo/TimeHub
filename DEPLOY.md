# TimeHub 宝塔面板部署指南

## 项目概述
TimeHub 是一个纯静态前端时间管理工具网站，包含番茄钟、秒表、多组倒计时、世界时钟、截止倒计时、呼吸训练等6个功能页面。采用 Vanilla JS + CSS，无框架，适合部署在宝塔面板 Nginx 环境下。

## 环境要求
- 宝塔面板（建议 7.9+ 版本）
- Nginx 1.20+（或 Apache 2.4+）
- 域名（可选，支持 HTTPS）
- SSL 证书（可选，推荐使用 Let's Encrypt）

## 部署步骤

### 1. 上传项目文件
1. 登录宝塔面板，进入「文件」管理
2. 选择网站根目录（如：`/www/wwwroot/timehub.example.com`）
3. 将 TimeHub 所有文件上传到此目录
   - 所有 `.html` 文件（7 个工具页 + `404.html` + 2 个旧地址重定向页）
   - `css/` 目录及所有样式文件
   - `js/` 目录及所有 JavaScript 文件
   - `assets/` 目录（图标，含 PWA 用的 PNG）
   - `manifest.json` 和 `sw.js`（PWA 支持）
   - 建议一并上传 `LICENSE`、`CHANGELOG.md`、`README.md`
4. 确保文件权限正确：
   ```bash
   chown -R www:www /www/wwwroot/timehub.example.com
   chmod -R 755 /www/wwwroot/timehub.example.com
   ```

### 2. 创建网站（Nginx）
1. 进入宝塔「网站」页面
2. 点击「添加站点」
3. 填写信息：
   - 域名：`timehub.example.com`（替换为你的域名）
   - 根目录：`/www/wwwroot/timehub.example.com`
   - PHP 版本：纯静态，选择「纯静态」
   - 数据库：不需要
   - FTP：按需创建
   - 创建 SSL：稍后配置
4. 点击「提交」创建站点

### 3. 配置 Nginx（关键步骤）
1. 进入站点设置 → 「配置文件」
2. 在 `server` 块中添加以下配置：

```nginx
server {
    listen 80;
    server_name timehub.example.com;
    root /www/wwwroot/timehub.example.com;
    index index.html;

    # 启用 gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Service Worker 必须不被缓存，否则用户永远拿不到新版本
    # 注意用 = 精确匹配：普通前缀匹配（location /sw.js）会输给下面的正则，
    # 导致 sw.js 被当成普通 JS 缓存 30 天，Service Worker 再也更新不了
    location = /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # 静态资源缓存（sw.js 已被上面的精确匹配拦截，不会走到这里）
    location ~* \.(css|js|svg|png|jpg|jpeg|gif|ico|webp|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # HTML 文件不缓存
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    # 找不到的文件交给 404 页面处理
    # 注意：不要写成 try_files $uri $uri/ /index.html ——
    # 那是单页应用（SPA）的写法，会把所有错误地址都当成首页返回 200，
    # 搜索引擎会判定为"软 404"，对收录不利
    location / {
        try_files $uri $uri/ =404;
    }

    error_page 404 /404.html;
    location = /404.html {
        internal;
    }

    # 防止访问隐藏文件
    location ~ /\. {
        deny all;
    }
}
```

3. 保存配置并重启 Nginx：
   ```bash
   nginx -t  # 测试配置
   systemctl restart nginx  # 重启服务
   ```

### 4. 配置 SSL（HTTPS）
1. 进入站点设置 → 「SSL」
2. 选择「Let's Encrypt」免费证书
3. 勾选域名，选择「文件验证」
4. 点击「申请」
5. 申请成功后，开启「强制 HTTPS」

### 5. 配置 PWA（可选但推荐）
1. 确保 `manifest.json` 中的主题色为 `#C0392B`
2. 确保所有页面已引入 `manifest.json` 和 `sw.js`
3. 在 Nginx 配置中已添加 Service Worker 的缓存控制头

### 6. 测试部署
访问你的域名，检查以下功能：
- [ ] 首页能正常加载
- [ ] 所有导航链接正常工作
- [ ] 番茄钟计时器能运行
- [ ] 秒表能开始/暂停
- [ ] 多组倒计时能添加和启动
- [ ] 世界时钟显示正确时间
- [ ] 截止倒计时能添加事项
- [ ] 呼吸训练动画能播放
- [ ] 深色模式切换正常
- [ ] Toast 通知能显示
- [ ] PWA 可安装（Chrome → 添加到主屏幕）

## 故障排除

### 1. 页面显示 404
- 检查 Nginx 配置中的 `try_files` 指令
- 确保文件路径正确，大小写敏感
- 检查文件权限：`ls -la /www/wwwroot/timehub.example.com`

### 2. JavaScript 不工作
- 检查浏览器控制台错误（F12）
- 确认所有 `.js` 文件已正确加载
- 检查 Nginx 的 MIME 类型配置

### 3. PWA 无法安装
- 检查 `manifest.json` 路径是否正确
- 确保通过 HTTPS 访问
- 检查 Service Worker 是否注册成功（Application → Service Workers）

### 4. 深色模式不工作
- 检查浏览器是否支持 `prefers-color-scheme`
- 检查 `css/base.css` 中的媒体查询
- 清除浏览器缓存后重试

### 5. 静态资源加载慢
- 启用 Nginx gzip 压缩
- 配置合适的缓存头
- 使用 CDN 加速（可选）

## 高级配置

### 1. 子目录部署
如果要将 TimeHub 部署在子目录（如 `/timehub/`）：
1. 修改所有页面中的资源路径为相对路径（已支持）
2. 修改 `manifest.json` 中的 `start_url` 为 `/timehub/index.html`
3. 修改 Nginx 配置中的根目录和 `try_files`

### 2. CDN 加速
1. 将静态资源上传到 CDN
2. 修改页面中的资源链接为 CDN 地址
3. 配置 CDN 缓存策略

### 3. 监控与日志
- 查看 Nginx 访问日志：`/www/wwwlogs/timehub.example.com.log`
- 查看错误日志：`/www/wwwlogs/timehub.example.com.error.log`
- 使用宝塔监控功能查看流量和性能

## 维护更新
1. 备份原文件后上传新版本
2. **升级版本号**：把 `sw.js` 的 `VERSION` 和 `js/common.js` 里 `CONSTANTS.VERSION` 一起加一（两处要一致）
   —— 新 Service Worker 安装时才会清掉旧缓存，否则用户拿到的仍是旧 CSS/JS
3. 强制刷新页面核对：`Ctrl+Shift+R`（macOS 为 `Cmd+Shift+R`）
4. 在 DevTools → Application → Service Workers 确认新版本已激活
5. 测试所有功能是否正常

## 联系方式
如有部署问题，请检查：
1. 宝塔面板官方文档
2. Nginx 配置手册
3. 项目 GitHub Issues（如有）

---
**最后更新：2026年9月**
**适用版本：TimeHub v1.1.0**
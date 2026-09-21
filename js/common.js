/* TimeHub - 共享功能库 */
/* 版本: 1.0 */

(function() {
  'use strict';

  // 全局 TimeHub 命名空间
  window.TimeHub = window.TimeHub || {};

  /* ===== 常量定义 ===== */
  TimeHub.CONSTANTS = {
    SITE_NAME: 'TimeHub',
    VERSION: '1.1.0',
    STORAGE_KEY: 'timehub_data',
    PAGES: {
      DASHBOARD: 'index.html',
      POMODORO: 'pomodoro.html',
      STOPWATCH: 'stopwatch.html',
      MULTI_TIMER: 'countdown.html',
      WORLD_CLOCK: 'worldclock.html',
      DEADLINE: 'deadline.html',
      BREATHING: 'breathing.html'
    },
    DEFAULT_SETTINGS: {
      theme: 'auto',
      notifications: true,
      sound: true,
      language: 'zh-CN'
    }
  };

  /* ===== 工具函数 ===== */

  /**
   * 防抖函数
   * @param {Function} func - 要执行的函数
   * @param {number} wait - 等待时间(ms)
   * @returns {Function} 防抖函数
   */
  TimeHub.debounce = function(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  /**
   * 节流函数
   * @param {Function} func - 要执行的函数
   * @param {number} limit - 限制时间(ms)
   * @returns {Function} 节流函数
   */
  TimeHub.throttle = function(func, limit = 300) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  };

  /**
   * 生成唯一ID
   * @returns {string} 唯一ID
   */
  TimeHub.generateId = function() {
    return 'id_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  };

  /**
   * 格式化时间（HH:MM:SS）
   * @param {number} seconds - 总秒数
   * @returns {string} 格式化时间字符串
   */
  TimeHub.formatTime = function(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * 格式化时间（带毫秒）
   * @param {number} milliseconds - 总毫秒数
   * @returns {string} 格式化时间字符串
   */
  TimeHub.formatTimeWithMs = function(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const ms = Math.floor(milliseconds % 1000);
    const timeStr = TimeHub.formatTime(totalSeconds);
    return `${timeStr}.${ms.toString().padStart(3, '0')}`;
  };

  /**
   * 格式化日期
   * @param {Date|string|number} date - 日期对象或字符串
   * @param {string} format - 格式字符串 (YYYY-MM-DD, YYYY年MM月DD日等)
   * @returns {string} 格式化日期字符串
   */
  TimeHub.formatDate = function(date, format = 'YYYY-MM-DD') {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';

    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');

    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  };

  /**
   * 计算两个日期之间的天数差
   * @param {Date} date1 - 第一个日期
   * @param {Date} date2 - 第二个日期
   * @returns {number} 天数差（绝对值）
   */
  TimeHub.daysBetween = function(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  /* ===== DOM 操作函数 ===== */

  /**
   * 设置导航栏活动状态
   * @param {string} currentPage - 当前页面文件名
   */
  TimeHub.setActiveNav = function(currentPage) {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPage || (currentPage === 'index.html' && href === './')) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  };

  /**
   * 显示通知消息
   * @param {string} message - 消息内容
   * @param {string} type - 消息类型 (success, error, warning, info)
   * @param {number} duration - 显示时间(ms)，0表示不自动关闭
   */
  TimeHub.showNotification = function(message, type = 'info', duration = 3000) {
    // 创建通知容器（如果不存在）
    let container = document.getElementById('notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 300px;
      `;
      document.body.appendChild(container);
    }

    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
      background: var(--surface-color);
      color: var(--text-color);
      padding: var(--spacing-md);
      border-radius: var(--border-radius-md);
      box-shadow: var(--shadow-lg);
      border-left: 4px solid var(--${type}-color);
      animation: slideUp 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--spacing-md);
    `;

    notification.innerHTML = `
      <div style="flex: 1;">
        <strong style="text-transform: capitalize;">${type}:</strong> ${message}
      </div>
      <button class="btn btn-secondary btn-sm" style="padding: 4px 8px; font-size: 12px;">×</button>
    `;

    // 添加到容器
    container.appendChild(notification);

    // 关闭按钮事件
    const closeBtn = notification.querySelector('button');
    closeBtn.addEventListener('click', () => {
      notification.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    });

    // 自动关闭
    if (duration > 0) {
      setTimeout(() => {
        if (notification.parentNode) {
          notification.style.animation = 'fadeOut 0.3s ease';
          setTimeout(() => notification.remove(), 300);
        }
      }, duration);
    }
  };

  /**
   * 确认对话框
   * @param {string} message - 确认消息
   * @param {Function} onConfirm - 确认回调
   * @param {Function} onCancel - 取消回调
   */
  TimeHub.confirmDialog = function(message, onConfirm, onCancel) {
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9998;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.3s ease;
    `;

    // 创建对话框
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: var(--surface-color);
      border-radius: var(--border-radius-lg);
      padding: var(--spacing-xl);
      max-width: 400px;
      width: 90%;
      box-shadow: var(--shadow-xl);
      animation: slideUp 0.3s ease;
    `;

    dialog.innerHTML = `
      <h3 style="margin-bottom: var(--spacing-md);">确认操作</h3>
      <p style="margin-bottom: var(--spacing-xl);">${message}</p>
      <div style="display: flex; gap: var(--spacing-md); justify-content: flex-end;">
        <button class="btn btn-secondary" id="confirm-cancel">取消</button>
        <button class="btn btn-primary" id="confirm-ok">确定</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // 事件处理
    const handleConfirm = () => {
      if (onConfirm) onConfirm();
      overlay.remove();
    };

    const handleCancel = () => {
      if (onCancel) onCancel();
      overlay.remove();
    };

    dialog.querySelector('#confirm-ok').addEventListener('click', handleConfirm);
    dialog.querySelector('#confirm-cancel').addEventListener('click', handleCancel);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) handleCancel();
    });

    // ESC键关闭
    const handleEsc = (e) => {
      if (e.key === 'Escape') handleCancel();
    };
    document.addEventListener('keydown', handleEsc);
    overlay.addEventListener('remove', () => {
      document.removeEventListener('keydown', handleEsc);
    });
  };

  /**
   * 加载中指示器
   * @param {boolean} show - 显示/隐藏
   * @param {string} text - 加载文本
   */
  TimeHub.loading = function(show, text = '加载中...') {
    let spinner = document.getElementById('global-spinner');

    if (show) {
      if (!spinner) {
        spinner = document.createElement('div');
        spinner.id = 'global-spinner';
        spinner.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          animation: fadeIn 0.3s ease;
        `;

        spinner.innerHTML = `
          <div class="spinner" style="
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s linear infinite;
            margin-bottom: var(--spacing-md);
          "></div>
          <div>${text}</div>
        `;

        // 添加旋转动画
        const style = document.createElement('style');
        style.textContent = `
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);

        document.body.appendChild(spinner);
      }
    } else if (spinner) {
      spinner.remove();
    }
  };

  /* ===== 本地存储操作 ===== */

  /**
   * 获取所有存储数据
   * @returns {Object} 存储数据对象
   */
  TimeHub.getStorage = function() {
    try {
      const data = localStorage.getItem(TimeHub.CONSTANTS.STORAGE_KEY);
      return data ? JSON.parse(data) : { ...TimeHub.CONSTANTS.DEFAULT_SETTINGS };
    } catch (error) {
      console.error('读取存储数据失败:', error);
      return { ...TimeHub.CONSTANTS.DEFAULT_SETTINGS };
    }
  };

  /**
   * 保存数据到本地存储
   * @param {Object} data - 要保存的数据
   */
  TimeHub.saveStorage = function(data) {
    try {
      localStorage.setItem(TimeHub.CONSTANTS.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('保存数据失败:', error);
    }
  };

  /**
   * 更新存储数据（合并）
   * @param {Object} updates - 更新的数据
   */
  TimeHub.updateStorage = function(updates) {
    const current = TimeHub.getStorage();
    TimeHub.saveStorage({ ...current, ...updates });
  };

  /**
   * 清除所有存储数据
   */
  TimeHub.clearStorage = function() {
    localStorage.removeItem(TimeHub.CONSTANTS.STORAGE_KEY);
  };

  /* ===== 设置相关 ===== */

  /**
   * 获取当前设置
   * @returns {Object} 设置对象
   */
  TimeHub.getSettings = function() {
    const storage = TimeHub.getStorage();
    return { ...TimeHub.CONSTANTS.DEFAULT_SETTINGS, ...storage };
  };

  /**
   * 更新设置
   * @param {Object} newSettings - 新设置
   */
  TimeHub.updateSettings = function(newSettings) {
    TimeHub.updateStorage(newSettings);
    // 触发设置变更事件
    window.dispatchEvent(new CustomEvent('timehub-settings-changed', {
      detail: newSettings
    }));
  };

  /* ===== 页面工具 ===== */

  /**
   * 生成工具卡片HTML
   * @param {Object} tool - 工具信息对象
   * @returns {string} 卡片HTML
   */
  TimeHub.generateToolCard = function(tool) {
    return `
      <div class="card tool-card" data-tool="${tool.id}">
        <div class="tool-card-header">
          <img src="${tool.icon}" alt="${tool.name}图标" class="tool-icon">
          <h3 class="tool-name">${tool.name}</h3>
        </div>
        <p class="tool-description">${tool.description}</p>
        <div class="tool-card-footer">
          <a href="${tool.link}" class="btn btn-primary">开始使用</a>
          <span class="tool-stats">${tool.stats || '0'} 次使用</span>
        </div>
      </div>
    `;
  };

  /**
   * 记录工具使用
   * @param {string} toolId - 工具ID
   */
  TimeHub.recordToolUsage = function(toolId) {
    const stats = TimeHub.getStorage().toolStats || {};
    stats[toolId] = (stats[toolId] || 0) + 1;
    TimeHub.updateStorage({ toolStats: stats });
  };

  /* ===== 主题管理 ===== */

  /**
   * 获取当前主题设置（用户的选择，可能是 'auto'）
   * @returns {string} 'auto', 'light', 'dark'
   */
  TimeHub.getTheme = function() {
    const storage = TimeHub.getStorage();
    const settings = storage.settings || {};
    // 兼容历史数据：早期版本把 theme 同时写在顶层和 settings 里，两处都认
    return settings.theme || storage.theme || 'auto';
  };

  /**
   * 把「用户选择」解析成「最终生效」的主题
   * auto 跟随系统，其余原样返回
   * @param {string} theme - 'auto', 'light', 'dark'
   * @returns {string} 'light' | 'dark'
   */
  TimeHub.resolveTheme = function(theme) {
    if (theme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme === 'dark' ? 'dark' : 'light';
  };

  /**
   * 设置主题
   * @param {string} theme - 'auto', 'light', 'dark'
   */
  TimeHub.setTheme = function(theme) {
    if (!['auto', 'light', 'dark'].includes(theme)) {
      console.warn('无效的主题:', theme);
      return;
    }

    const storage = TimeHub.getStorage();
    const settings = storage.settings || {};
    settings.theme = theme;
    // 顶层 theme 是早期版本的字段，一并写入，避免两处取值不一致
    TimeHub.saveStorage({ ...storage, theme, settings });

    // 应用主题
    TimeHub.applyTheme(theme);

    // 触发设置变更事件
    window.dispatchEvent(new CustomEvent('timehub-settings-changed', {
      detail: { theme }
    }));
  };

  /**
   * 应用主题到页面
   * 唯一的主题开关：把**最终生效**的主题写到 <html data-theme="light|dark">。
   * 所有 CSS 都基于这个属性变色（见 css/base.css 顶部说明），
   * 因此不存在"有些地方跟系统、有些地方跟按钮"的分裂。
   * @param {string} theme - 'auto', 'light', 'dark'
   * @returns {string} 实际生效的主题
   */
  TimeHub.applyTheme = function(theme) {
    const effective = TimeHub.resolveTheme(theme);
    const html = document.documentElement;

    html.setAttribute('data-theme', effective);
    // 同时保留主题类名，方便第三方样式/用户自定义 CSS 挂钩
    html.classList.toggle('theme-dark', effective === 'dark');
    html.classList.toggle('theme-light', effective === 'light');

    return effective;
  };

  /**
   * 切换主题（三态循环：auto -> light -> dark -> auto）
   */
  TimeHub.cycleTheme = function() {
    const current = TimeHub.getTheme();
    let next;

    switch (current) {
      case 'auto':
        next = 'light';
        break;
      case 'light':
        next = 'dark';
        break;
      case 'dark':
        next = 'auto';
        break;
      default:
        next = 'auto';
    }

    TimeHub.setTheme(next);
    return next;
  };

  /**
   * 初始化主题系统
   */
  TimeHub.initTheme = function() {
    // 加载保存的主题并立即应用
    const theme = TimeHub.getTheme();
    TimeHub.applyTheme(theme);

    // 主题切换按钮
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
      TimeHub.updateThemeIcon(themeToggle, theme);

      themeToggle.addEventListener('click', () => {
        const newTheme = TimeHub.cycleTheme();
        TimeHub.updateThemeIcon(themeToggle, newTheme);

        const messages = {
          auto: '跟随系统主题',
          light: '浅色主题',
          dark: '深色主题'
        };
        if (window.toast) {
          window.toast(`已切换为${messages[newTheme]}`, 'info', 2000);
        }
      });
    } else {
      console.warn('未找到主题切换按钮（.theme-toggle），请检查页面结构');
    }

    // 系统主题变化：仅在用户选择「跟随系统」时生效
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (TimeHub.getTheme() !== 'auto') return;
      TimeHub.applyTheme('auto');
      if (themeToggle) {
        TimeHub.updateThemeIcon(themeToggle, 'auto');
      }
    });
  };

  /**
   * 更新主题按钮图标
   * @param {HTMLElement} button - 主题切换按钮
   * @param {string} theme - 当前主题
   */
  TimeHub.updateThemeIcon = function(button, theme) {
    const iconMap = {
      auto: '🌓', // 半月亮半太阳
      light: '☀️',
      dark: '🌙'
    };

    const labelMap = {
      auto: '跟随系统',
      light: '浅色主题',
      dark: '深色主题'
    };

    const iconSpan = button.querySelector('.theme-icon');
    if (iconSpan) {
      iconSpan.textContent = iconMap[theme] || '🌓';
    }

    // 更新aria-label
    button.setAttribute('aria-label', `切换主题（当前：${labelMap[theme]}）`);
  };

  /* ===== 初始化函数 ===== */

  /**
   * 初始化通用功能
   */
  TimeHub.initCommon = function() {
    // 设置导航活动状态
    const currentPage = window.location.pathname.split('/').pop();
    TimeHub.setActiveNav(currentPage);

    // 注册Service Worker (PWA支持)——只在成功时安静通过，失败才提示
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .catch(error => {
            console.error('[Service Worker] 注册失败:', error);
          });
      });
    }

    // 初始化主题系统
    TimeHub.initTheme();

    // 页脚年份与版本号：页面里只写 data 属性，值统一从这里注入，避免各页硬编码版本对不上
    document.querySelectorAll('[data-timehub-year]').forEach(el => {
      el.textContent = new Date().getFullYear();
    });
    document.querySelectorAll('[data-timehub-version]').forEach(el => {
      el.textContent = TimeHub.CONSTANTS.VERSION;
    });

    // 添加CSS动画定义（如果不存在）
    if (!document.querySelector('#timehub-animations')) {
      const style = document.createElement('style');
      style.id = 'timehub-animations';
      style.textContent = `
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  };

  // 页面加载完成后自动初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', TimeHub.initCommon);
  } else {
    TimeHub.initCommon();
  }

})();
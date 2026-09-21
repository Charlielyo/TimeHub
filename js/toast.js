/* TimeHub - 全局Toast通知系统 */
/* 版本: 1.0 */

(function() {
  'use strict';

  // 全局Toast队列
  const toastQueue = [];
  let isShowing = false;
  let toastContainer = null;

  // 颜色定义
  const toastColors = {
    success: '#38b000',
    info: '#4361ee',
    warning: '#f8961e',
    error: '#f72585'
  };

  // 图标定义
  const toastIcons = {
    success: '✓',
    info: 'ℹ️',
    warning: '⚠️',
    error: '✗'
  };

  // 初始化Toast容器
  function initContainer() {
    if (toastContainer) return;

    // 创建容器
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      left: 0;
      right: 0;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: center;
      pointer-events: none;
    `;

    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
      .toast {
        background: var(--surface-color);
        color: var(--text-color);
        border-radius: var(--border-radius-md);
        padding: var(--spacing-md) var(--spacing-lg);
        margin-bottom: var(--spacing-sm);
        box-shadow: var(--shadow-lg);
        border-left: 4px solid #4361ee;
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        max-width: 90%;
        width: 350px;
        pointer-events: auto;
        transform: translateY(-100px);
        opacity: 0;
        transition: transform 0.3s ease, opacity 0.3s ease;
        font-size: 0.9375rem;
        line-height: 1.4;
      }

      .toast.show {
        transform: translateY(0);
        opacity: 1;
      }

      .toast.hide {
        transform: translateY(-100px);
        opacity: 0;
      }

      .toast-icon {
        font-size: 1.125rem;
        flex-shrink: 0;
      }

      .toast-content {
        flex: 1;
      }

      .toast-close {
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 0;
        font-size: 1.25rem;
        line-height: 1;
        opacity: 0.6;
        transition: opacity 0.2s ease;
        flex-shrink: 0;
      }

      .toast-close:hover {
        opacity: 1;
      }

      /* Toast类型样式 */
      .toast-success {
        border-left-color: ${toastColors.success};
      }

      .toast-info {
        border-left-color: ${toastColors.info};
      }

      .toast-warning {
        border-left-color: ${toastColors.warning};
      }

      .toast-error {
        border-left-color: ${toastColors.error};
      }

      /* 深色主题适配（用 html[data-theme]，不要用系统媒体查询——站内切换按钮会失效） */
      [data-theme="dark"] .toast {
        background: var(--surface-color);
        border: 1px solid var(--border-color);
      }

      /* 移动端适配 */
      @media (max-width: 768px) {
        .toast {
          width: calc(100% - 40px);
          max-width: none;
          margin-left: var(--spacing-md);
          margin-right: var(--spacing-md);
        }
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(toastContainer);
  }

  // 显示下一个Toast
  function showNext() {
    if (toastQueue.length === 0 || isShowing) return;

    isShowing = true;
    const { message, type, duration } = toastQueue.shift();

    // 创建Toast元素
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');

    // 图标
    const icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.textContent = toastIcons[type];
    icon.setAttribute('aria-hidden', 'true');

    // 内容
    const content = document.createElement('div');
    content.className = 'toast-content';
    content.textContent = message;

    // 关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', '关闭通知');
    closeBtn.addEventListener('click', () => hideToast(toast));

    toast.appendChild(icon);
    toast.appendChild(content);
    toast.appendChild(closeBtn);

    toastContainer.appendChild(toast);

    // 触发动画
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // 自动隐藏
    const autoHide = setTimeout(() => {
      hideToast(toast);
    }, duration);

    // 保存定时器引用
    toast._autoHide = autoHide;

    // 监听动画结束
    toast.addEventListener('transitionend', function onEnd(e) {
      if (e.propertyName === 'opacity' && toast.classList.contains('hide')) {
        toast.remove();
        isShowing = false;
        showNext();
      }
    });
  }

  // 隐藏Toast
  function hideToast(toast) {
    if (toast._autoHide) {
      clearTimeout(toast._autoHide);
    }

    toast.classList.remove('show');
    toast.classList.add('hide');
  }

  // 公共API
  window.TimeHubToast = {
    /**
     * 显示Toast通知
     * @param {string} message - 显示的消息
     * @param {string} type - 类型: 'success', 'info', 'warning', 'error' (默认: 'info')
     * @param {number} duration - 显示时长(毫秒) (默认: 3000)
     */
    show: function(message, type = 'info', duration = 3000) {
      // 参数验证
      if (!message || typeof message !== 'string') {
        console.warn('Toast: message必须是字符串');
        return;
      }

      const validTypes = ['success', 'info', 'warning', 'error'];
      if (!validTypes.includes(type)) {
        type = 'info';
      }

      // 初始化容器
      initContainer();

      // 添加到队列
      toastQueue.push({
        message,
        type,
        duration: Math.max(1000, Math.min(10000, duration))
      });

      // 如果没有正在显示的Toast，立即显示
      if (!isShowing) {
        showNext();
      }
    },

    /**
     * 快捷方法
     */
    success: function(message, duration) {
      this.show(message, 'success', duration);
    },

    info: function(message, duration) {
      this.show(message, 'info', duration);
    },

    warning: function(message, duration) {
      this.show(message, 'warning', duration);
    },

    error: function(message, duration) {
      this.show(message, 'error', duration);
    },

    /**
     * 清除所有Toast
     */
    clear: function() {
      toastQueue.length = 0;

      const toasts = document.querySelectorAll('.toast');
      toasts.forEach(toast => {
        hideToast(toast);
      });
    },

    /**
     * 设置全局配置
     */
    config: function(options = {}) {
      if (options.colors) {
        Object.assign(toastColors, options.colors);
      }
      if (options.icons) {
        Object.assign(toastIcons, options.icons);
      }
    }
  };

  // 全局快捷函数
  window.toast = window.TimeHubToast.show;
  window.toast.success = window.TimeHubToast.success;
  window.toast.info = window.TimeHubToast.info;
  window.toast.warning = window.TimeHubToast.warning;
  window.toast.error = window.TimeHubToast.error;
  window.toast.clear = window.TimeHubToast.clear;
  window.toast.config = window.TimeHubToast.config;

  // 自动初始化容器
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initContainer);
  } else {
    initContainer();
  }

  // 导出
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.TimeHubToast;
  }
})();
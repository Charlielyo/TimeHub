/* TimeHub - 工具函数库 */
/* 版本: 1.0 */

(function() {
  'use strict';

  // 全局工具对象
  window.TimeHubUtils = window.TimeHubUtils || {};

  /* ===== 时间格式化函数 ===== */

  /**
   * 格式化时间为 MM:SS 或 HH:MM:SS 格式
   * @param {number} seconds - 总秒数
   * @returns {string} 格式化时间字符串
   */
  TimeHubUtils.formatTime = function(seconds) {
    if (isNaN(seconds) || seconds < 0) {
      return '00:00';
    }

    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * 格式化时间为 HH:MM:SS 格式（总是显示小时）
   * @param {number} seconds - 总秒数
   * @returns {string} 格式化时间字符串
   */
  TimeHubUtils.formatTimeWithHours = function(seconds) {
    if (isNaN(seconds) || seconds < 0) {
      return '00:00:00';
    }

    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * 格式化时间为 MM:SS 格式（不超过59分钟）
   * @param {number} seconds - 总秒数
   * @returns {string} 格式化时间字符串
   */
  TimeHubUtils.formatTimeMinutes = function(seconds) {
    if (isNaN(seconds) || seconds < 0) {
      return '00:00';
    }

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * 格式化时间（带毫秒）
   * @param {number} milliseconds - 总毫秒数
   * @returns {string} 格式化时间字符串
   */
  TimeHubUtils.formatTimeWithMs = function(milliseconds) {
    if (isNaN(milliseconds) || milliseconds < 0) {
      return '00:00.000';
    }

    const totalSeconds = Math.floor(milliseconds / 1000);
    const ms = Math.floor(milliseconds % 1000);
    const timeStr = TimeHubUtils.formatTime(totalSeconds);
    return `${timeStr}.${ms.toString().padStart(3, '0')}`;
  };

  /**
   * 格式化日期为中文格式
   * @param {Date|string|number} date - 日期对象或字符串
   * @param {string} format - 格式字符串
   *   - 'YYYY-MM-DD': 2024-01-01
   *   - 'YYYY年MM月DD日': 2024年01月01日
   *   - 'MM月DD日': 01月01日
   *   - 'YYYY/MM/DD': 2024/01/01
   * @returns {string} 格式化日期字符串
   */
  TimeHubUtils.formatDate = function(date, format = 'YYYY-MM-DD') {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      return '无效日期';
    }

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
   * 格式化日期为中文日期（2024年01月01日 星期一）
   * @param {Date|string|number} date - 日期对象或字符串
   * @returns {string} 中文日期字符串
   */
  TimeHubUtils.formatChineseDate = function(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      return '无效日期';
    }

    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');

    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const weekday = weekdays[d.getDay()];

    return `${year}年${month}月${day}日 ${weekday}`;
  };

  /**
   * 计算两个日期之间的天数差
   * @param {Date|string|number} date1 - 第一个日期
   * @param {Date|string|number} date2 - 第二个日期
   * @returns {number} 天数差（绝对值）
   */
  TimeHubUtils.daysBetween = function(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);

    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
      return 0;
    }

    const diffTime = Math.abs(d2 - d1);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  /**
   * 获取当前时间戳（秒）
   * @returns {number} 当前时间戳（秒）
   */
  TimeHubUtils.getCurrentTimestamp = function() {
    return Math.floor(Date.now() / 1000);
  };

  /**
   * 获取当前时间戳（毫秒）
   * @returns {number} 当前时间戳（毫秒）
   */
  TimeHubUtils.getCurrentTimestampMs = function() {
    return Date.now();
  };

  /* ===== 本地存储操作 ===== */

  /**
   * 从localStorage读取数据
   * @param {string} key - 存储键名
   * @param {*} defaultValue - 默认值
   * @returns {*} 存储的值或默认值
   */
  TimeHubUtils.getLocalStorage = function(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`读取localStorage失败 (${key}):`, error);
      return defaultValue;
    }
  };

  /**
   * 保存数据到localStorage
   * @param {string} key - 存储键名
   * @param {*} value - 要保存的值
   * @returns {boolean} 是否成功
   */
  TimeHubUtils.setLocalStorage = function(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`保存到localStorage失败 (${key}):`, error);
      return false;
    }
  };

  /**
   * 从localStorage删除数据
   * @param {string} key - 存储键名
   * @returns {boolean} 是否成功
   */
  TimeHubUtils.removeLocalStorage = function(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`从localStorage删除失败 (${key}):`, error);
      return false;
    }
  };

  /**
   * 清空所有localStorage数据
   * @returns {boolean} 是否成功
   */
  TimeHubUtils.clearLocalStorage = function() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('清空localStorage失败:', error);
      return false;
    }
  };

  /**
   * 检查localStorage中是否有指定键
   * @param {string} key - 存储键名
   * @returns {boolean} 是否存在
   */
  TimeHubUtils.hasLocalStorage = function(key) {
    return localStorage.getItem(key) !== null;
  };

  /* ===== 其他工具函数 ===== */

  /**
   * 生成唯一ID
   * @returns {string} 唯一ID
   */
  TimeHubUtils.generateId = function() {
    return 'id_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  };

  /**
   * 防抖函数
   * @param {Function} func - 要执行的函数
   * @param {number} wait - 等待时间(ms)
   * @returns {Function} 防抖函数
   */
  TimeHubUtils.debounce = function(func, wait = 300) {
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
  TimeHubUtils.throttle = function(func, limit = 300) {
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
   * 复制文本到剪贴板
   * @param {string} text - 要复制的文本
   * @returns {Promise<boolean>} 是否成功
   */
  TimeHubUtils.copyToClipboard = function(text) {
    return new Promise((resolve) => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
          .then(() => resolve(true))
          .catch(() => {
            // 降级方案
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            resolve(success);
          });
      } else {
        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        resolve(success);
      }
    });
  };

  /**
   * 获取URL参数
   * @param {string} name - 参数名
   * @returns {string|null} 参数值
   */
  TimeHubUtils.getUrlParam = function(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  };

  /**
   * 设置页面标题（带有网站名称）
   * @param {string} title - 页面标题
   */
  TimeHubUtils.setPageTitle = function(title) {
    document.title = title ? `${title} - TimeHub` : 'TimeHub';
  };

  /**
   * 检查是否是移动设备
   * @returns {boolean} 是否是移动设备
   */
  TimeHubUtils.isMobile = function() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // 初始化完成日志
  console.log('TimeHubUtils 工具库已加载');

})();
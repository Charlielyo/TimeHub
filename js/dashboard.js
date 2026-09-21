/* TimeHub - 仪表盘交互逻辑 */
/* 版本: 1.0 */

(function() {
  'use strict';

  // 确保 TimeHub 对象存在
  if (!window.TimeHub) {
    console.error('TimeHub 全局对象未找到，请先加载 common.js');
    return;
  }

  /* ===== 常量定义 ===== */
  const TOOLS = [
    {
      id: 'pomodoro',
      name: '番茄钟',
      description: '使用番茄工作法提高专注力，25分钟工作 + 5分钟休息的循环',
      icon: 'assets/icons/pomodoro.svg',
      link: 'pomodoro.html',
      color: '#4361ee',
      category: '专注'
    },
    {
      id: 'stopwatch',
      name: '秒表',
      description: '精确到毫秒的计时器，支持计圈、暂停、重置功能',
      icon: 'assets/icons/stopwatch.svg',
      link: 'stopwatch.html',
      color: '#7209b7',
      category: '计时'
    },
    {
      id: 'multi-timer',
      name: '多组倒计时',
      description: '同时管理多个倒计时器，支持分组和批量操作',
      icon: 'assets/icons/multi-timer.svg',
      link: 'countdown.html',
      color: '#f8961e',
      category: '计时'
    },
    {
      id: 'world-clock',
      name: '世界时钟',
      description: '查看全球多个时区的时间，方便跨时区协作',
      icon: 'assets/icons/world-clock.svg',
      link: 'worldclock.html',
      color: '#4cc9f0',
      category: '时间'
    },
    {
      id: 'deadline',
      name: '截止倒计时',
      description: '设置重要日期，实时查看剩余时间并跟踪进度',
      icon: 'assets/icons/deadline.svg',
      link: 'deadline.html',
      color: '#f72585',
      category: '规划'
    },
    {
      id: 'breathing',
      name: '呼吸训练',
      description: '通过4-7-8呼吸法缓解压力，恢复专注力',
      icon: 'assets/icons/breathing.svg',
      link: 'breathing.html',
      color: '#38b000',
      category: '健康'
    }
  ];

  /* ===== 状态管理 ===== */
  const Dashboard = {
    // 初始化状态
    initialized: false,
    recentLimit: 5,

    // 初始化仪表盘
    init: function() {
      if (this.initialized) return;

      // 加载数据并渲染
      this.loadData();
      this.renderTools();
      this.renderRecent();
      this.setupEventListeners();
      this.updateStats();

      this.initialized = true;
      console.log('仪表盘已初始化');
    },

    // 加载数据
    loadData: function() {
      // 从本地存储加载使用统计
      this.stats = TimeHub.getStorage().toolStats || {};
      this.recent = TimeHub.getStorage().recentTools || [];

      // 更新每个工具的使用次数
      TOOLS.forEach(tool => {
        tool.stats = this.stats[tool.id] || 0;
      });
    },

    // 保存数据
    saveData: function() {
      const storage = TimeHub.getStorage();
      storage.toolStats = this.stats;
      storage.recentTools = this.recent;
      TimeHub.saveStorage(storage);
    },

    // 记录工具使用
    recordUsage: function(toolId) {
      // 更新统计
      this.stats[toolId] = (this.stats[toolId] || 0) + 1;

      // 更新最近使用记录
      const now = new Date().toISOString();
      const tool = TOOLS.find(t => t.id === toolId);

      if (tool) {
        const recentItem = {
          id: toolId,
          name: tool.name,
          icon: tool.icon,
          timestamp: now,
          formattedTime: this.formatRecentTime(now)
        };

        // 移除重复项（如果存在）
        this.recent = this.recent.filter(item => item.id !== toolId);

        // 添加到开头
        this.recent.unshift(recentItem);

        // 限制数量
        if (this.recent.length > this.recentLimit) {
          this.recent = this.recent.slice(0, this.recentLimit);
        }

        // 保存并更新显示
        this.saveData();
        this.renderRecent();
        this.updateStats();

        // 也更新工具卡片的统计显示
        const toolCard = document.querySelector(`.tool-card[data-tool="${toolId}"] .tool-stats`);
        if (toolCard) {
          toolCard.textContent = `${this.stats[toolId]} 次使用`;
        }
      }
    },

    // 格式化最近使用时间
    formatRecentTime: function(timestamp) {
      const now = new Date();
      const time = new Date(timestamp);
      const diffMs = now - time;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) {
        return '刚刚';
      } else if (diffMins < 60) {
        return `${diffMins}分钟前`;
      } else if (diffHours < 24) {
        return `${diffHours}小时前`;
      } else if (diffDays < 7) {
        return `${diffDays}天前`;
      } else {
        return TimeHub.formatDate(time, 'MM-DD');
      }
    },

    // 渲染工具卡片
    renderTools: function() {
      const toolsGrid = document.getElementById('tools-grid');
      if (!toolsGrid) return;

      // 清空加载占位符
      toolsGrid.innerHTML = '';

      // 按使用次数排序
      const sortedTools = [...TOOLS].sort((a, b) => {
        const statsA = this.stats[a.id] || 0;
        const statsB = this.stats[b.id] || 0;
        return statsB - statsA;
      });

      // 生成卡片
      sortedTools.forEach(tool => {
        const card = document.createElement('div');
        card.className = 'tool-card';
        card.dataset.tool = tool.id;

        card.innerHTML = `
          <div class="tool-card-header">
            <img src="${tool.icon}" alt="${tool.name}图标" class="tool-icon" style="background: ${tool.color}20">
            <h3 class="tool-name">${tool.name}</h3>
          </div>
          <p class="tool-description">${tool.description}</p>
          <div class="tool-card-footer">
            <a href="${tool.link}" class="btn btn-primary">开始使用</a>
            <span class="tool-stats">${tool.stats || '0'} 次使用</span>
          </div>
        `;

        // 添加点击事件（记录使用）
        const startBtn = card.querySelector('.btn-primary');
        startBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.recordUsage(tool.id);

          // 添加点击动画
          e.target.classList.add('animate-pulse');
          setTimeout(() => {
            e.target.classList.remove('animate-pulse');
            // 延迟跳转以记录数据
            window.location.href = tool.link;
          }, 300);
        });

        toolsGrid.appendChild(card);
      });
    },

    // 渲染最近使用记录
    renderRecent: function() {
      const recentList = document.getElementById('recent-list');
      if (!recentList) return;

      if (this.recent.length === 0) {
        recentList.innerHTML = `
          <div class="empty-state">
            <span class="empty-icon">📊</span>
            <p>暂无最近使用记录</p>
            <p class="empty-hint">开始使用工具后，这里会显示您的使用历史</p>
          </div>
        `;
        return;
      }

      recentList.innerHTML = '';

      this.recent.forEach(item => {
        const recentItem = document.createElement('div');
        recentItem.className = 'recent-item';

        recentItem.innerHTML = `
          <img src="${item.icon}" alt="${item.name}图标" class="recent-icon">
          <div class="recent-info">
            <h4 class="recent-tool-name">${item.name}</h4>
            <p class="recent-time">${item.formattedTime}</p>
          </div>
          <div class="recent-actions">
            <button class="btn btn-secondary btn-sm" data-action="use" title="再次使用">
              🔄
            </button>
          </div>
        `;

        // 添加事件监听器
        const useBtn = recentItem.querySelector('[data-action="use"]');
        useBtn.addEventListener('click', () => {
          this.recordUsage(item.id);
          const tool = TOOLS.find(t => t.id === item.id);
          if (tool) {
            window.location.href = tool.link;
          }
        });

        recentList.appendChild(recentItem);
      });
    },

    // 清除最近使用记录
    clearRecent: function() {
      TimeHub.confirmDialog(
        '确定要清除所有最近使用记录吗？此操作不可撤销。',
        () => {
          this.recent = [];
          this.saveData();
          this.renderRecent();
          TimeHub.showNotification('最近使用记录已清除', 'success');
        },
        () => {
          TimeHub.showNotification('已取消清除操作', 'info');
        }
      );
    },

    // 更新统计数字（带动画）
    updateStats: function() {
      // 总使用次数
      const totalUses = Object.values(this.stats).reduce((sum, count) => sum + count, 0);

      // 更新UI
      this.animateNumber('total-users', Math.floor(1234 + totalUses / 10));
      this.animateNumber('total-sessions', Math.floor(5678 + totalUses));
      this.animateNumber('total-minutes', Math.floor(12345 + totalUses * 25));
    },

    // 数字动画
    animateNumber: function(elementId, targetValue) {
      const element = document.getElementById(elementId);
      if (!element) return;

      const currentValue = parseInt(element.textContent.replace(/,/g, '')) || 0;
      const duration = 1000; // 动画时长(ms)
      const steps = 60; // 步数
      const stepValue = (targetValue - currentValue) / steps;
      let currentStep = 0;

      const animate = () => {
        if (currentStep >= steps) {
          element.textContent = targetValue.toLocaleString();
          return;
        }

        const value = Math.floor(currentValue + stepValue * currentStep);
        element.textContent = value.toLocaleString();
        currentStep++;

        setTimeout(animate, duration / steps);
      };

      animate();
    },

    // 设置事件监听器
    setupEventListeners: function() {
      // 清除最近使用记录按钮
      const clearBtn = document.getElementById('clear-recent');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => this.clearRecent());
      }

      // 工具卡片点击（事件委托） - 已禁用，因为主页使用静态卡片链接
      // document.addEventListener('click', (e) => {
      //   const toolCard = e.target.closest('.tool-card');
      //   if (toolCard) {
      //     const toolId = toolCard.dataset.tool;
      //     // 防止重复记录（开始使用按钮已处理）
      //     e.preventDefault();
      //   }
      // });

      // 设置按钮（如果存在）
      const settingsBtn = document.getElementById('settings-btn');
      if (settingsBtn) {
        settingsBtn.addEventListener('click', () => this.openSettings());
      }

      // 键盘快捷键
      document.addEventListener('keydown', (e) => {
        // Alt + 数字键快速跳转到工具
        if (e.altKey && e.key >= '1' && e.key <= '6') {
          const index = parseInt(e.key) - 1;
          if (TOOLS[index]) {
            e.preventDefault();
            this.recordUsage(TOOLS[index].id);
            window.location.href = TOOLS[index].link;
          }
        }

        // ESC键关闭所有模态框
        if (e.key === 'Escape') {
          this.closeModals();
        }
      });
    },

    // 打开设置面板
    openSettings: function() {
      // 创建设置面板
      const overlay = document.createElement('div');
      overlay.className = 'settings-overlay';
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

      const settings = TimeHub.getSettings();

      const panel = document.createElement('div');
      panel.className = 'settings-panel';
      panel.style.cssText = `
        background: var(--surface-color);
        border-radius: var(--border-radius-lg);
        padding: var(--spacing-xl);
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: var(--shadow-xl);
        animation: slideUp 0.3s ease;
      `;

      panel.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-xl);">
          <h3 style="margin: 0;">设置</h3>
          <button class="btn btn-secondary btn-sm" id="close-settings">×</button>
        </div>

        <div class="settings-group">
          <h4 style="margin-bottom: var(--spacing-md);">主题</h4>
          <div style="display: flex; gap: var(--spacing-md); margin-bottom: var(--spacing-xl);">
            <label style="display: flex; align-items: center; gap: var(--spacing-sm);">
              <input type="radio" name="theme" value="auto" ${settings.theme === 'auto' ? 'checked' : ''}>
              自动（跟随系统）
            </label>
            <label style="display: flex; align-items: center; gap: var(--spacing-sm);">
              <input type="radio" name="theme" value="light" ${settings.theme === 'light' ? 'checked' : ''}>
              浅色
            </label>
            <label style="display: flex; align-items: center; gap: var(--spacing-sm);">
              <input type="radio" name="theme" value="dark" ${settings.theme === 'dark' ? 'checked' : ''}>
              深色
            </label>
          </div>
        </div>

        <div class="settings-group">
          <h4 style="margin-bottom: var(--spacing-md);">通知</h4>
          <div style="display: flex; gap: var(--spacing-md); margin-bottom: var(--spacing-xl);">
            <label style="display: flex; align-items: center; gap: var(--spacing-sm);">
              <input type="checkbox" name="notifications" ${settings.notifications ? 'checked' : ''}>
              启用桌面通知
            </label>
          </div>
        </div>

        <div class="settings-group">
          <h4 style="margin-bottom: var(--spacing-md);">声音</h4>
          <div style="display: flex; gap: var(--spacing-md); margin-bottom: var(--spacing-xl);">
            <label style="display: flex; align-items: center; gap: var(--spacing-sm);">
              <input type="checkbox" name="sound" ${settings.sound ? 'checked' : ''}>
              启用声音提示
            </label>
          </div>
        </div>

        <div style="display: flex; gap: var(--spacing-md); justify-content: flex-end;">
          <button class="btn btn-secondary" id="reset-settings">重置</button>
          <button class="btn btn-primary" id="save-settings">保存</button>
        </div>
      `;

      overlay.appendChild(panel);
      document.body.appendChild(overlay);

      // 事件监听器
      const closeBtn = panel.querySelector('#close-settings');
      closeBtn.addEventListener('click', () => overlay.remove());

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
      });

      const saveBtn = panel.querySelector('#save-settings');
      saveBtn.addEventListener('click', () => {
        const theme = panel.querySelector('input[name="theme"]:checked')?.value;
        const notifications = panel.querySelector('input[name="notifications"]')?.checked;
        const sound = panel.querySelector('input[name="sound"]')?.checked;

        TimeHub.updateSettings({
          theme,
          notifications,
          sound
        });

        TimeHub.showNotification('设置已保存', 'success');
        overlay.remove();
      });

      const resetBtn = panel.querySelector('#reset-settings');
      resetBtn.addEventListener('click', () => {
        TimeHub.updateSettings(TimeHub.CONSTANTS.DEFAULT_SETTINGS);
        TimeHub.showNotification('设置已重置为默认值', 'success');
        overlay.remove();
      });
    },

    // 关闭所有模态框
    closeModals: function() {
      document.querySelectorAll('.settings-overlay').forEach(el => el.remove());
    }
  };

  /* ===== 初始化 ===== */
  // 等待DOM加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Dashboard.init());
  } else {
    Dashboard.init();
  }

  // 暴露到全局
  window.TimeHub.Dashboard = Dashboard;

})();
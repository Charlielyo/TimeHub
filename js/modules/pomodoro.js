/* TimeHub - 番茄钟计时器核心模块 */
/* 版本: 1.0 */

(function() {
  'use strict';

  /* ===== 常量定义 ===== */
  const MODES = {
    POMODORO: {
      id: 'pomodoro',
      name: '专注时间',
      duration: 25 * 60, // 25分钟（秒）
      color: '#f72585',
      nextMode: 'short-break'
    },
    SHORT_BREAK: {
      id: 'short-break',
      name: '短休息',
      duration: 5 * 60, // 5分钟（秒）
      color: '#4cc9f0',
      nextMode: 'pomodoro'
    },
    LONG_BREAK: {
      id: 'long-break',
      name: '长休息',
      duration: 15 * 60, // 15分钟（秒）
      color: '#38b000',
      nextMode: 'pomodoro'
    }
  };

  const TOMATO_GROUP_SIZE = 4; // 每4个番茄钟后长休息

  /* ===== DOM 元素引用 ===== */
  let elements = {
    modeTabs: null,
    timeDisplay: null,
    modeLabel: null,
    progressRing: null,
    startBtn: null,
    pauseBtn: null,
    resetBtn: null,
    tomatoGroup: null,
    tomatoDots: null,
    // Tab导航
    panelTabs: null,
    tabContents: null,
    // 任务管理
    addTaskBtn: null,
    taskInputContainer: null,
    newTaskInput: null,
    saveTaskBtn: null,
    cancelTaskBtn: null,
    taskList: null,
    taskCategory: null,
    clearCompletedBtn: null,
    currentTomatoCount: null,
    currentTaskInfo: null,
    // 白噪音
    whiteNoiseToggle: null,
    whiteNoiseGrid: null,
    volumeSlider: null,
    volumeValue: null,
    // 统计
    refreshStatsBtn: null,
    todayTomatoes: null,
    todayFocusTime: null,
    todayTasks: null,
    currentStreak: null,
    statsChart: null,
    totalTomatoes: null,
    todayFocusMinutes: null,
    streakDays: null,
    heatmap: null,
    historyList: null,
    // 设置
    pomodoroDuration: null,
    shortBreakDuration: null,
    longBreakDuration: null,
    durationBtns: null,
    notificationToggle: null,
    soundToggle: null,
    exportDataBtn: null,
    importDataBtn: null,
    resetDataBtn: null
  };

  /* ===== 番茄钟计时器类 ===== */
  class PomodoroTimer {
    constructor() {
      this.currentMode = MODES.POMODORO;
      this.timeLeft = MODES.POMODORO.duration; // 剩余时间（秒）
      this.isRunning = false;
      this.timerInterval = null;
      this.tomatoCount = 0; // 当前番茄组中完成的番茄数
      this.totalTomatoes = 0; // 今日总番茄数

      // 任务管理
      this.tasks = []; // 任务数组 {id, text, completed, createdAt}
      this.editingTaskId = null;

      // 白噪音
      this.selectedSound = 'off';
      this.volume = 0.5; // 0-1
      this.audioContext = null;
      this.ambGain = null;      // 主增益节点
      this.ambNodes = [];       // 所有底层音频节点引用
      this.zenTimer = null;     // 沉浸模式更新定时器

      // 统计
      this.stats = {
        todayFocusSeconds: 0,
        completedTasks: 0,
        streakDays: 0,
        totalTomatoes: 0,
        todayFocusMinutes: 0
      };

      // 设置
      this.settings = {
        pomodoroDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        notifications: true,
        soundEnabled: true
      };

      // 历史记录
      this.history = [];

      // 当前关联的任务
      this.currentTaskId = null;

      this.initAudio();
      this.loadState();
      this.initElements();
      this.bindEvents();
      this.updateDisplay();
      this.updateTomatoDots();
      this.loadTasks();
      this.updateStats();
      this.loadSettings();
      this.loadHistory();
      this.updateDurationDisplays();
      this.initSettingsUI();
      this.initAmbient();
      this.bindKeyboardShortcuts();
    }

    /* ===== 音频初始化 ===== */
    initAudio() {
      try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      } catch (error) {
        console.warn('Web Audio API 不支持或已禁用，将使用备用提示音');
      }
    }

    /* ===== 状态加载和保存 ===== */
    loadState() {
      // 从localStorage加载今日番茄数
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const stats = TimeHubUtils.getLocalStorage('timehub_pomodoro_stats', {});
      this.totalTomatoes = stats[today] || 0;

      // 加载白噪音设置
      const noiseSettings = TimeHubUtils.getLocalStorage('timehub_white_noise', {
        sound: 'off',
        volume: 50
      });
      this.selectedSound = noiseSettings.sound || 'off';
      this.volume = (noiseSettings.volume ?? 50) / 100;

      // 加载连续天数
      this.stats.streakDays = TimeHubUtils.getLocalStorage('timehub_streak', 0);
    }

    loadSettings() {
      const settings = TimeHubUtils.getLocalStorage('timehub_settings', {
        pomodoroDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        notifications: true,
        soundEnabled: true
      });

      this.settings = settings;

      // 更新MODES常量
      MODES.POMODORO.duration = settings.pomodoroDuration * 60;
      MODES.SHORT_BREAK.duration = settings.shortBreakDuration * 60;
      MODES.LONG_BREAK.duration = settings.longBreakDuration * 60;

      // 如果当前模式的时间已改变，更新timeLeft
      if (this.currentMode.id === 'pomodoro') {
        this.timeLeft = MODES.POMODORO.duration;
      } else if (this.currentMode.id === 'short-break') {
        this.timeLeft = MODES.SHORT_BREAK.duration;
      } else if (this.currentMode.id === 'long-break') {
        this.timeLeft = MODES.LONG_BREAK.duration;
      }
    }

    saveSettings() {
      TimeHubUtils.setLocalStorage('timehub_settings', this.settings);
    }

    loadHistory() {
      this.history = TimeHubUtils.getLocalStorage('timehub_history', []);
    }

    saveHistory() {
      TimeHubUtils.setLocalStorage('timehub_history', this.history);
    }

    addHistoryRecord() {
      const record = {
        id: TimeHubUtils.generateId(),
        timestamp: Date.now(),
        taskId: this.currentTaskId,
        taskText: this.currentTaskId ? this.tasks.find(t => t.id === this.currentTaskId)?.text : null
      };

      this.history.push(record);
      this.saveHistory();

      // 只保留最近100条记录
      if (this.history.length > 100) {
        this.history = this.history.slice(-100);
      }
    }

    saveState() {
      const today = new Date().toISOString().split('T')[0];
      const stats = TimeHubUtils.getLocalStorage('timehub_pomodoro_stats', {});
      stats[today] = this.totalTomatoes;
      TimeHubUtils.setLocalStorage('timehub_pomodoro_stats', stats);

      // 保存白噪音设置
      TimeHubUtils.setLocalStorage('timehub_white_noise', {
        sound: this.selectedSound,
        volume: Math.round(this.volume * 100)
      });

      // 保存连续天数
      TimeHubUtils.setLocalStorage('timehub_streak', this.stats.streakDays);
    }

    updateDurationDisplays() {
      if (elements.pomodoroDuration) {
        elements.pomodoroDuration.textContent = this.settings.pomodoroDuration;
      }
      if (elements.shortBreakDuration) {
        elements.shortBreakDuration.textContent = this.settings.shortBreakDuration;
      }
      if (elements.longBreakDuration) {
        elements.longBreakDuration.textContent = this.settings.longBreakDuration;
      }
    }

    adjustDuration(durationType, isPlus) {
      let duration;
      switch(durationType) {
        case 'pomodoro':
          duration = this.settings.pomodoroDuration;
          break;
        case 'short-break':
          duration = this.settings.shortBreakDuration;
          break;
        case 'long-break':
          duration = this.settings.longBreakDuration;
          break;
        default:
          return;
      }

      // 调整时长（限制在1-60分钟之间）
      if (isPlus && duration < 60) {
        duration++;
      } else if (!isPlus && duration > 1) {
        duration--;
      }

      // 更新设置
      switch(durationType) {
        case 'pomodoro':
          this.settings.pomodoroDuration = duration;
          MODES.POMODORO.duration = duration * 60;
          break;
        case 'short-break':
          this.settings.shortBreakDuration = duration;
          MODES.SHORT_BREAK.duration = duration * 60;
          break;
        case 'long-break':
          this.settings.longBreakDuration = duration;
          MODES.LONG_BREAK.duration = duration * 60;
          break;
      }

      // 如果当前模式的时间已改变，更新timeLeft
      if (this.currentMode.id === durationType ||
          (durationType === 'pomodoro' && this.currentMode.id === 'pomodoro') ||
          (durationType === 'short-break' && this.currentMode.id === 'short-break') ||
          (durationType === 'long-break' && this.currentMode.id === 'long-break')) {
        this.timeLeft = this.currentMode.duration;
        this.updateDisplay();
      }

      this.updateDurationDisplays();
      this.saveSettings();
    }

    updateStats() {
      // 计算累计番茄数
      const stats = TimeHubUtils.getLocalStorage('timehub_pomodoro_stats', {});
      let totalTomatoes = 0;
      Object.values(stats).forEach(count => {
        totalTomatoes += count;
      });

      // 今日专注分钟数
      const todayFocusMinutes = this.totalTomatoes * 25;

      // 更新DOM元素
      if (elements.todayTomatoes) {
        elements.todayTomatoes.textContent = this.totalTomatoes;
      }

      if (elements.totalTomatoes) {
        elements.totalTomatoes.textContent = totalTomatoes;
      }

      if (elements.todayFocusMinutes) {
        elements.todayFocusMinutes.textContent = todayFocusMinutes;
      }

      if (elements.streakDays) {
        elements.streakDays.textContent = this.stats.streakDays;
      }

      // 更新历史记录列表
      this.renderHistory();

      // 更新热力图
      this.renderHeatmap();
    }

    renderHistory() {
      if (!elements.historyList) return;

      // 清空列表
      elements.historyList.innerHTML = '';

      // 获取今日的历史记录
      const today = new Date().toISOString().split('T')[0];
      const todayHistory = this.history.filter(record => {
        const recordDate = new Date(record.timestamp).toISOString().split('T')[0];
        return recordDate === today;
      }).reverse(); // 最新的在前

      if (todayHistory.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.className = 'history-item empty-history';
        emptyItem.innerHTML = '<span>今日暂无番茄记录</span>';
        elements.historyList.appendChild(emptyItem);
        return;
      }

      // 渲染历史记录
      todayHistory.forEach(record => {
        const historyItem = document.createElement('li');
        historyItem.className = 'history-item';

        const time = new Date(record.timestamp);
        const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
        const taskText = record.taskText ? this.escapeHtml(record.taskText) : '无关联任务';

        historyItem.innerHTML = `
          <span class="history-time">${timeStr}</span>
          <span class="history-task" title="${taskText}">${taskText}</span>
        `;

        elements.historyList.appendChild(historyItem);
      });
    }

    renderHeatmap() {
      if (!elements.heatmap) return;

      // 简化版热力图 - 显示文本说明
      elements.heatmap.innerHTML = `
        <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
          <p>热力图功能开发中...</p>
          <p style="font-size: 0.875rem;">将显示过去6个月的番茄活动</p>
        </div>
      `;

      // 实际的热力图实现需要更复杂的逻辑：
      // 1. 计算过去6个月每天的番茄数
      // 2. 生成SVG网格
      // 3. 根据番茄数着色
      // 由于时间关系，这里仅显示占位符
    }

    /* ===== DOM 元素初始化 ===== */
    initElements() {
      console.log('正在初始化DOM元素...');
      window.pomodoroElements = elements; // 暴露给全局用于调试
      elements.modeTabs = document.getElementById('mode-tabs');
      elements.timeDisplay = document.getElementById('time-display');
      elements.modeLabel = document.getElementById('mode-label');
      elements.progressRing = document.querySelector('.progress-ring-fill');
      elements.startBtn = document.getElementById('start-btn');
      elements.pauseBtn = document.getElementById('pause-btn');
      elements.resetBtn = document.getElementById('reset-btn');
      elements.tomatoGroup = document.getElementById('tomato-group');
      elements.tomatoDots = document.querySelectorAll('.tomato-dot');
      // Tab导航
      elements.panelTabs = document.querySelectorAll('.panel-tab');
      elements.tabContents = document.querySelectorAll('.tab-content');
      // 任务管理
      elements.addTaskBtn = document.getElementById('add-task-btn');
      elements.newTaskInput = document.getElementById('new-task-input');
      elements.taskList = document.getElementById('task-list');
      elements.taskCategory = document.getElementById('task-category');
      elements.clearCompletedBtn = document.getElementById('clear-completed-btn');
      elements.currentTomatoCount = document.getElementById('current-tomato-count');
      elements.currentTaskInfo = document.getElementById('current-task-info');
      // 白噪音
      elements.whiteNoiseGrid = document.getElementById('white-noise-grid');
      elements.volumeSlider = document.getElementById('volume-slider');
      elements.volumeValue = document.getElementById('volume-value');
      elements.ambientBar = document.getElementById('ambient-bar');
      elements.ambientOptions = document.querySelectorAll('.ambient-option');
      elements.ambientVolume = document.getElementById('ambient-volume');
      elements.zenBtn = document.getElementById('zen-btn');
      elements.zenOverlay = document.getElementById('zen-overlay');
      elements.zenClose = document.getElementById('zen-close');
      // 统计
      elements.totalTomatoes = document.getElementById('total-tomatoes');
      elements.todayFocusMinutes = document.getElementById('today-focus-minutes');
      elements.streakDays = document.getElementById('streak-days');
      elements.heatmap = document.getElementById('heatmap');
      elements.historyList = document.getElementById('history-list');
      // 设置
      elements.pomodoroDuration = document.getElementById('pomodoro-duration');
      elements.shortBreakDuration = document.getElementById('short-break-duration');
      elements.longBreakDuration = document.getElementById('long-break-duration');
      elements.durationBtns = document.querySelectorAll('.duration-btn');
      elements.notificationToggle = document.getElementById('notification-toggle');
      elements.soundToggle = document.getElementById('sound-toggle');
      elements.exportDataBtn = document.getElementById('export-data-btn');
      elements.importDataBtn = document.getElementById('import-data-btn');
      elements.resetDataBtn = document.getElementById('reset-data-btn');
    }

    /* ===== 事件绑定 ===== */
    bindEvents() {
      // 确保关键元素存在，如果缺失则重新初始化
      if (!elements.startBtn || !elements.modeTabs || elements.panelTabs.length === 0) {
        this.initElements();
      }
      // 模式切换Tab点击事件
      if (elements.modeTabs) {
        elements.modeTabs.addEventListener('click', (e) => {
          const tab = e.target.closest('.mode-tab');
          if (!tab) return;

          const modeId = tab.dataset.mode;
          this.switchMode(modeId);
        });
      }

      // 开始按钮
      if (elements.startBtn) {
        elements.startBtn.addEventListener('click', () => {
          if (this.isRunning) {
            this.pause();
          } else {
            this.start();
          }
        });
      }

      // 暂停按钮
      if (elements.pauseBtn) {
        elements.pauseBtn.addEventListener('click', () => this.pause());
      }

      // 重置按钮
      if (elements.resetBtn) {
        elements.resetBtn.addEventListener('click', () => this.reset());
      }

      // 页面可见性变化时暂停（防止后台继续计时）
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.isRunning) {
          this.pause();
          if (elements.startBtn) {
            elements.startBtn.textContent = '继续';
          }
        }
      });

      // 绑定任务、白噪音和统计事件
      this.bindTaskEvents();

      // Tab切换事件
      this.bindTabEvents();

      // 设置事件
      this.bindSettingEvents();
    }

    /* ===== 模式切换 ===== */
    switchMode(modeId) {
      // 如果正在运行，先暂停
      if (this.isRunning) {
        this.pause();
      }

      // 更新当前模式
      switch(modeId) {
        case 'pomodoro':
          this.currentMode = MODES.POMODORO;
          break;
        case 'short-break':
          this.currentMode = MODES.SHORT_BREAK;
          break;
        case 'long-break':
          this.currentMode = MODES.LONG_BREAK;
          break;
        default:
          return;
      }

      // 重置时间
      this.timeLeft = this.currentMode.duration;

      // 更新UI
      this.updateTabSelection();
      this.updateModeColor();
      this.updateDisplay();

      // 更新按钮状态
      if (elements.startBtn) {
        elements.startBtn.textContent = '开始';
        elements.startBtn.disabled = false;
      }
      if (elements.pauseBtn) {
        elements.pauseBtn.disabled = true;
      }
    }

    /* ===== 计时器控制 ===== */
    start() {
      if (this.isRunning) return;

      this.isRunning = true;
      this.timerInterval = setInterval(() => this.tick(), 1000);

      // 尝试恢复音频上下文（处理浏览器自动播放策略）
      if (this.selectedSound !== 'off' && this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().then(() => {
          if (this.ambNodes.length === 0) this.playAmb(this.selectedSound);
        });
      }

      // 更新按钮状态
      if (elements.startBtn) {
        elements.startBtn.textContent = '暂停';
      }
      if (elements.pauseBtn) {
        elements.pauseBtn.disabled = false;
      }
    }

    pause() {
      if (!this.isRunning) return;

      this.isRunning = false;
      clearInterval(this.timerInterval);
      this.timerInterval = null;

      // 更新按钮状态
      if (elements.startBtn) {
        elements.startBtn.textContent = '继续';
      }
      if (elements.pauseBtn) {
        elements.pauseBtn.disabled = true;
      }
    }

    reset() {
      // 停止计时器
      this.pause();

      // 重置时间
      this.timeLeft = this.currentMode.duration;

      // 更新显示
      this.updateDisplay();

      // 重置按钮状态
      if (elements.startBtn) {
        elements.startBtn.textContent = '开始';
      }
    }

    /* ===== 计时器tick函数 ===== */
    tick() {
      if (this.timeLeft <= 0) {
        this.onTimerEnd();
        return;
      }

      this.timeLeft--;
      this.updateDisplay();
      if (this.zenTimer) this.updateZen();
    }

    /* ===== 计时器结束处理 ===== */
    onTimerEnd() {
      // 停止计时器
      this.pause();

      // 播放提示音
      this.playCompletionSound();

      // 显示通知
      this.showCompletionNotification();

      // 如果是专注模式完成，更新番茄计数
      if (this.currentMode.id === 'pomodoro') {
        this.tomatoCount++;
        this.totalTomatoes++;
        this.saveState();
        this.updateTomatoDots();

        // 更新关联任务的番茄计数
        if (this.currentTaskId) {
          const task = this.tasks.find(t => t.id === this.currentTaskId);
          if (task) {
            task.tomatoCount = (task.tomatoCount || 0) + 1;
            this.saveTasks();
          }
        }

        // 添加历史记录
        this.addHistoryRecord();

        // 更新UI
        this.updateCurrentTaskInfo();
        this.renderTasks();

        // 每完成4个番茄钟，切换到长休息
        if (this.tomatoCount >= TOMATO_GROUP_SIZE) {
          this.tomatoCount = 0;
          this.switchMode('long-break');
        } else {
          // 否则切换到短休息
          this.switchMode('short-break');
        }
      } else {
        // 休息结束，切换回专注模式
        this.switchMode('pomodoro');
      }
    }

    /* ===== 音频提示 ===== */
    playCompletionSound() {
      if (!this.settings.soundEnabled) return;

      // 尝试使用独立的提示音 context 或复用现有 context
      let ctx = this.audioContext;
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.audioContext = ctx;
      }

      try {
        // 播放三音递进提示音
        const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
        const duration = 0.2; // 每个音持续时间（秒）
        const interval = 0.1; // 音之间间隔（秒）

        let time = ctx.currentTime;

        frequencies.forEach((freq) => {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);

          oscillator.frequency.value = freq;
          oscillator.type = 'sine';

          // 音量包络
          gainNode.gain.setValueAtTime(0, time);
          gainNode.gain.linearRampToValueAtTime(0.3, time + 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

          oscillator.start(time);
          oscillator.stop(time + duration);

          time += duration + interval;
        });
      } catch (error) {
        console.warn('播放提示音失败:', error);
      }
    }

    /* ===== 显示通知 ===== */
    showCompletionNotification() {
      if (!this.settings.notifications) return;

      if (window.Notification && Notification.permission === 'granted') {
        new Notification('TimeHub 番茄钟', {
          body: `${this.currentMode.name} 已完成！`,
          icon: 'assets/icons/pomodoro.svg'
        });
      } else if (window.Notification && Notification.permission === 'default') {
        // 请求通知权限
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('TimeHub 番茄钟', {
              body: `${this.currentMode.name} 已完成！`,
              icon: 'assets/icons/pomodoro.svg'
            });
          }
        });
      }
    }

    /* ===== UI 更新函数 ===== */
    updateDisplay() {
      // 更新时间显示
      if (elements.timeDisplay) {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        elements.timeDisplay.textContent =
          `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }

      // 更新模式标签
      if (elements.modeLabel) {
        elements.modeLabel.textContent = this.currentMode.name;
      }

      // 更新进度环
      if (elements.progressRing) {
        const totalTime = this.currentMode.duration;
        const progress = 1 - (this.timeLeft / totalTime);
        const circumference = 2 * Math.PI * 88; // r=88
        const offset = circumference * (1 - progress);
        elements.progressRing.style.strokeDashoffset = offset;
      }

      // 沉浸模式同步更新
      if (this.zenTimer) this.updateZen();
    }

    updateTabSelection() {
      if (!elements.modeTabs) return;

      // 移除所有active类
      const tabs = elements.modeTabs.querySelectorAll('.mode-tab');
      tabs.forEach(tab => tab.classList.remove('active'));

      // 为当前模式添加active类
      const currentTab = elements.modeTabs.querySelector(`[data-mode="${this.currentMode.id}"]`);
      if (currentTab) {
        currentTab.classList.add('active');
      }
    }

    updateModeColor() {
      // 更新CSS变量 --c
      document.documentElement.style.setProperty('--c', this.currentMode.color);

      // 计算并设置RGB变量
      const rgb = this.hexToRgb(this.currentMode.color);
      if (rgb) {
        document.documentElement.style.setProperty('--current-color-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
      }

      // 更新按钮颜色
      if (elements.startBtn) {
        elements.startBtn.style.backgroundColor = this.currentMode.color;
      }
    }

    hexToRgb(hex) {
      // 移除#号
      hex = hex.replace(/^#/, '');

      // 处理3位简写
      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }

      // 转换为RGB
      const num = parseInt(hex, 16);
      if (isNaN(num)) return null;

      return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
      };
    }

    updateTomatoDots() {
      if (!elements.tomatoDots) return;

      elements.tomatoDots.forEach((dot, index) => {
        if (index < this.tomatoCount) {
          dot.classList.add('filled');
        } else {
          dot.classList.remove('filled');
        }
      });
    }

    /* ===== 任务管理 ===== */
    loadTasks() {
      const savedTasks = TimeHubUtils.getLocalStorage('timehub_tasks', []);
      this.tasks = savedTasks;
      this.renderTasks();
    }

    saveTasks() {
      TimeHubUtils.setLocalStorage('timehub_tasks', this.tasks);
    }

    renderTasks() {
      if (!elements.taskList) return;

      // 清空列表
      elements.taskList.innerHTML = '';

      if (this.tasks.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.className = 'task-item empty-task';
        emptyItem.innerHTML = '<span>暂无任务，点击"添加"创建</span>';
        elements.taskList.appendChild(emptyItem);
        return;
      }

      // 渲染每个任务
      this.tasks.forEach(task => {
        const taskItem = document.createElement('li');
        taskItem.className = `task-item ${task.completed ? 'completed' : ''} ${task.id === this.currentTaskId ? 'active' : ''}`;
        taskItem.dataset.id = task.id;

        // 分类标签
        const categoryLabels = {
          general: '常规',
          work: '工作',
          study: '学习',
          personal: '个人'
        };
        const categoryLabel = categoryLabels[task.category] || task.category;

        taskItem.innerHTML = `
          <div class="task-main">
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
            <div class="task-content">
              <span class="task-text">${this.escapeHtml(task.text)}</span>
              <span class="task-meta">
                <span class="task-category-badge">${categoryLabel}</span>
                ${task.tomatoCount > 0 ? `<span class="task-tomato-count">🍅 × ${task.tomatoCount}</span>` : ''}
              </span>
            </div>
          </div>
          <button class="task-remove" aria-label="删除任务">×</button>
        `;
        elements.taskList.appendChild(taskItem);

        // 添加事件监听器
        const checkbox = taskItem.querySelector('.task-checkbox');
        const removeBtn = taskItem.querySelector('.task-remove');
        const taskMain = taskItem.querySelector('.task-main');

        checkbox.addEventListener('change', (e) => {
          e.stopPropagation();
          this.toggleTask(task.id);
        });

        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.removeTask(task.id);
        });

        // 点击任务项关联到当前番茄
        taskMain.addEventListener('click', (e) => {
          if (e.target !== checkbox && e.target !== removeBtn) {
            this.associateTask(task.id);
          }
        });
      });
    }

    addTask(text, category = 'general') {
      if (!text.trim()) return;

      const newTask = {
        id: TimeHubUtils.generateId(),
        text: text.trim(),
        category: category,
        completed: false,
        createdAt: Date.now(),
        tomatoCount: 0 // 该任务完成的番茄数
      };

      this.tasks.push(newTask);
      this.saveTasks();
      this.renderTasks();
      this.updateStats();
    }

    associateTask(taskId) {
      this.currentTaskId = taskId;

      // 更新UI显示
      this.updateCurrentTaskInfo();

      // 重新渲染任务列表以更新active状态
      this.renderTasks();
    }

    clearCompletedTasks() {
      this.tasks = this.tasks.filter(task => !task.completed);
      this.saveTasks();
      this.renderTasks();
      this.updateStats();
    }

    updateCurrentTaskInfo() {
      if (!elements.currentTaskInfo || !elements.currentTomatoCount) return;

      if (this.currentTaskId) {
        const task = this.tasks.find(t => t.id === this.currentTaskId);
        if (task) {
          elements.currentTaskInfo.textContent = task.text;
          elements.currentTomatoCount.textContent = task.tomatoCount || 0;
          return;
        }
      }

      // 没有关联任务
      elements.currentTaskInfo.textContent = '未关联任务';
      elements.currentTomatoCount.textContent = '0';
    }

    removeTask(taskId) {
      this.tasks = this.tasks.filter(task => task.id !== taskId);
      this.saveTasks();
      this.renderTasks();
      this.updateStats();
    }

    toggleTask(taskId) {
      const task = this.tasks.find(t => t.id === taskId);
      if (task) {
        task.completed = !task.completed;
        this.saveTasks();
        this.renderTasks();
        this.updateStats();
      }
    }

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    /* ===== 白噪音 & 沉浸模式 ===== */
    createWhiteNoiseBuffer(ctx, duration) {
      const samples = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, samples, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < samples; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      return buffer;
    }

    createPinkNoiseBuffer(ctx, duration) {
      const samples = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, samples, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < samples; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        data[i] *= 0.11;
        b6 = white * 0.115926;
      }
      return buffer;
    }

    buildAmbNodes(sound) {
      if (!this.audioContext) return;
      if (!this.ambGain) {
        this.ambGain = this.audioContext.createGain();
        this.ambGain.connect(this.audioContext.destination);
      }

      const configs = {
        rain: {
          type: 'white',
          layers: [
            { filter: 'lowpass', freq: 1200, gain: 0.65 },
            { filter: 'bandpass', freq: 350, Q: 0.4, gain: 0.25 },
            { filter: 'highpass', freq: 3500, gain: 0.07 }
          ]
        },
        cafe: {
          type: 'pink',
          layers: [
            { filter: 'lowpass', freq: 500, gain: 0.8 },
            { filter: 'bandpass', freq: 1200, Q: 1, gain: 0.18 },
            { filter: 'bandpass', freq: 2800, Q: 0.5, gain: 0.04 }
          ]
        },
        forest: {
          type: 'pink',
          layers: [
            { filter: 'lowpass', freq: 320, gain: 0.9 },
            { filter: 'bandpass', freq: 850, Q: 1.5, gain: 0.35 },
            { filter: 'bandpass', freq: 1800, Q: 2, gain: 0.08 }
          ]
        },
        fire: {
          type: 'pink',
          layers: [
            { filter: 'lowpass', freq: 180, gain: 1.1 },
            { filter: 'bandpass', freq: 550, Q: 0.6, gain: 0.35 },
            { filter: 'highpass', freq: 4500, gain: 0.025 }
          ]
        }
      };

      const cfg = configs[sound];
      if (!cfg) return;

      const buf = cfg.type === 'white'
        ? this.createWhiteNoiseBuffer(this.audioContext, 20)
        : this.createPinkNoiseBuffer(this.audioContext, 20);

      cfg.layers.forEach(layer => {
        const src = this.audioContext.createBufferSource();
        src.buffer = buf;
        src.loop = true;

        let node = src;
        if (layer.filter) {
          const filt = this.audioContext.createBiquadFilter();
          filt.type = layer.filter;
          filt.frequency.value = layer.freq;
          if (layer.Q !== undefined) filt.Q.value = layer.Q;
          src.connect(filt);
          node = filt;
        }

        const gain = this.audioContext.createGain();
        gain.gain.value = layer.gain;
        node.connect(gain);
        gain.connect(this.ambGain);

        src.start();
        this.ambNodes.push(src, gain);
        if (node !== src) this.ambNodes.push(node);
      });
    }

    playAmb(sound) {
      if (sound === 'off' || !sound) {
        this.stopAmb();
        return;
      }
      this.stopAmb();
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      this.buildAmbNodes(sound);
      if (this.ambGain) {
        const now = this.audioContext.currentTime;
        this.ambGain.gain.setValueAtTime(0, now);
        this.ambGain.gain.linearRampToValueAtTime(this.volume, now + 0.5);
      }
    }

    stopAmb() {
      if (!this.audioContext || !this.ambGain) return;

      const oldGain = this.ambGain;
      const oldNodes = this.ambNodes.slice();

      this.ambGain = null;
      this.ambNodes = [];

      const now = this.audioContext.currentTime;
      try {
        const currentVol = oldGain.gain.value || this.volume || 0.5;
        oldGain.gain.setValueAtTime(currentVol, now);
        oldGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      } catch (e) {}

      setTimeout(() => {
        oldNodes.forEach(n => {
          try {
            if (typeof n.stop === 'function') n.stop();
            n.disconnect();
          } catch (e) {}
        });
        try { oldGain.disconnect(); } catch (e) {}
      }, 600);
    }

    initAmbient() {
      // 设置Tab音量滑块
      if (elements.volumeSlider) {
        elements.volumeSlider.value = Math.round(this.volume * 100);
      }
      if (elements.volumeValue) {
        elements.volumeValue.textContent = `${Math.round(this.volume * 100)}%`;
      }

      // 左侧控制条音量
      if (elements.ambientVolume) {
        elements.ambientVolume.value = Math.round(this.volume * 100);
      }

      // 设置Tab声音选择
      this.updateAmbientUI(this.selectedSound);

      // 事件：设置Tab网格
      if (elements.whiteNoiseGrid) {
        elements.whiteNoiseGrid.addEventListener('click', (e) => {
          const option = e.target.closest('.white-noise-option');
          if (!option) return;
          this.selectAmbient(option.dataset.sound);
        });
      }

      // 事件：左侧控制条
      if (elements.ambientBar) {
        elements.ambientBar.addEventListener('click', (e) => {
          const option = e.target.closest('.ambient-option');
          if (!option) return;
          this.selectAmbient(option.dataset.sound);
        });
      }

      // 事件：音量滑块（设置Tab）
      if (elements.volumeSlider) {
        elements.volumeSlider.addEventListener('input', (e) => {
          this.setVolume(e.target.value / 100);
        });
      }

      // 事件：左侧音量
      if (elements.ambientVolume) {
        elements.ambientVolume.addEventListener('input', (e) => {
          this.setVolume(e.target.value / 100);
        });
      }

      // 事件：沉浸模式
      if (elements.zenBtn) {
        elements.zenBtn.addEventListener('click', () => this.toggleZen());
      }
      if (elements.zenClose) {
        elements.zenClose.addEventListener('click', () => this.toggleZen());
      }

      // 如果上次不是off，自动播放
      if (this.selectedSound !== 'off') {
        this.playAmb(this.selectedSound);
      }
    }

    selectAmbient(sound) {
      this.selectedSound = sound || 'off';
      this.updateAmbientUI(this.selectedSound);
      this.playAmb(this.selectedSound);
      this.saveState();
    }

    setVolume(val) {
      this.volume = Math.max(0, Math.min(1, val));
      if (elements.volumeSlider) elements.volumeSlider.value = Math.round(this.volume * 100);
      if (elements.volumeValue) elements.volumeValue.textContent = `${Math.round(this.volume * 100)}%`;
      if (elements.ambientVolume) elements.ambientVolume.value = Math.round(this.volume * 100);
      if (this.ambGain && this.audioContext) {
        const now = this.audioContext.currentTime;
        this.ambGain.gain.setTargetAtTime(this.volume, now, 0.1);
      }
      this.saveState();
    }

    updateAmbientUI(sound) {
      // 设置Tab
      if (elements.whiteNoiseGrid) {
        elements.whiteNoiseGrid.querySelectorAll('.white-noise-option').forEach(opt => {
          opt.classList.toggle('active', opt.dataset.sound === sound);
        });
      }
      // 左侧控制条
      if (elements.ambientOptions) {
        elements.ambientOptions.forEach(opt => {
          opt.classList.toggle('active', opt.dataset.sound === sound);
        });
      }
    }

    /* ===== 沉浸模式 ===== */
    toggleZen() {
      const overlay = elements.zenOverlay;
      if (!overlay) return;

      if (overlay.classList.contains('active')) {
        overlay.classList.remove('active');
        if (this.zenTimer) {
          clearInterval(this.zenTimer);
          this.zenTimer = null;
        }
      } else {
        overlay.classList.add('active');
        this.updateZen();
        this.zenTimer = setInterval(() => this.updateZen(), 1000);
      }
    }

    updateZen() {
      const m1 = document.getElementById('zen-m1');
      const m2 = document.getElementById('zen-m2');
      const s1 = document.getElementById('zen-s1');
      const s2 = document.getElementById('zen-s2');
      const fill = document.getElementById('zen-progress-fill');
      const label = document.getElementById('zen-mode-label');
      const ambLabel = document.getElementById('zen-ambient-label');

      const minutes = Math.floor(this.timeLeft / 60);
      const seconds = this.timeLeft % 60;
      const mm = minutes.toString().padStart(2, '0');
      const ss = seconds.toString().padStart(2, '0');

      if (m1) m1.textContent = mm[0];
      if (m2) m2.textContent = mm[1];
      if (s1) s1.textContent = ss[0];
      if (s2) s2.textContent = ss[1];

      if (label) label.textContent = this.currentMode.name;

      const total = this.currentMode.duration;
      const progress = total > 0 ? ((total - this.timeLeft) / total) * 100 : 0;
      if (fill) fill.style.width = `${progress}%`;

      if (ambLabel) {
        const names = { off: '', rain: '🌧 雨声', cafe: '☕ 咖啡', forest: '🌿 森林', fire: '🔥 篝火' };
        ambLabel.textContent = names[this.selectedSound] || '';
      }
    }

    /* ===== 统计 ===== */
    updateStats() {
      // 计算今日完成的番茄数（已由totalTomatoes跟踪）
      if (elements.todayTomatoes) {
        elements.todayTomatoes.textContent = this.totalTomatoes;
      }

      // 计算今日专注时间（番茄数 * 25分钟）
      const focusMinutes = this.totalTomatoes * 25;
      const focusHours = Math.floor(focusMinutes / 60);
      const focusMins = focusMinutes % 60;
      if (elements.todayFocusTime) {
        elements.todayFocusTime.textContent = focusHours > 0
          ? `${focusHours}:${focusMins.toString().padStart(2, '0')}`
          : `${focusMins}:00`;
      }

      // 计算今日完成任务数
      const completedTasks = this.tasks.filter(task => task.completed).length;
      if (elements.todayTasks) {
        elements.todayTasks.textContent = completedTasks;
      }

      // 计算连续天数（简化版）
      this.calculateStreak();
      if (elements.currentStreak) {
        elements.currentStreak.textContent = this.stats.streakDays;
      }
    }

    calculateStreak() {
      // 简化版：假设只要今天有番茄就增加连续天数
      const stats = TimeHubUtils.getLocalStorage('timehub_pomodoro_stats', {});
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      let streak = 0;
      if (stats[today] && stats[today] > 0) {
        streak = (stats[yesterday] && stats[yesterday] > 0) ? this.stats.streakDays + 1 : 1;
      }

      this.stats.streakDays = streak;
      TimeHubUtils.setLocalStorage('timehub_streak', this.stats.streakDays);
    }

    /* ===== Tab切换功能 ===== */
    bindTabEvents() {
      if (elements.panelTabs) {
        elements.panelTabs.forEach(tab => {
          tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            this.switchTab(tabId);
          });
        });
      }
    }

    switchTab(tabId) {
      // 更新Tab按钮状态
      elements.panelTabs.forEach(tab => {
        if (tab.dataset.tab === tabId) {
          tab.classList.add('active');
        } else {
          tab.classList.remove('active');
        }
      });

      // 显示对应的Tab内容
      elements.tabContents.forEach(content => {
        if (content.id === `${tabId}-tab`) {
          content.classList.add('active');
        } else {
          content.classList.remove('active');
        }
      });

      // 如果是统计Tab，更新统计数据
      if (tabId === 'stats') {
        this.updateStats();
      }
    }

    /* ===== 设置事件绑定 ===== */
    bindSettingEvents() {
      // 时长调整按钮
      if (elements.durationBtns) {
        elements.durationBtns.forEach(btn => {
          btn.addEventListener('click', () => {
            const durationType = btn.dataset.duration;
            const isPlus = btn.classList.contains('plus');
            this.adjustDuration(durationType, isPlus);
          });
        });
      }

      // 通知开关
      if (elements.notificationToggle) {
        elements.notificationToggle.addEventListener('change', () => {
          this.settings.notifications = elements.notificationToggle.checked;
          this.saveSettings();
        });
      }

      // 声音开关
      if (elements.soundToggle) {
        elements.soundToggle.addEventListener('change', () => {
          this.settings.soundEnabled = elements.soundToggle.checked;
          this.saveSettings();
        });
      }

      // 数据管理按钮
      if (elements.exportDataBtn) {
        elements.exportDataBtn.addEventListener('click', () => this.exportData());
      }

      if (elements.importDataBtn) {
        elements.importDataBtn.addEventListener('click', () => this.importData());
      }

      if (elements.resetDataBtn) {
        elements.resetDataBtn.addEventListener('click', () => this.resetData());
      }
    }

    /* ===== 事件绑定扩展 ===== */
    bindTaskEvents() {
      // 添加任务按钮
      if (elements.addTaskBtn) {
        elements.addTaskBtn.addEventListener('click', () => {
          this.addTaskFromInput();
        });
      }

      // 按Enter键添加任务
      if (elements.newTaskInput) {
        elements.newTaskInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            this.addTaskFromInput();
          }
        });
      }

      // 清除已完成任务按钮
      if (elements.clearCompletedBtn) {
        elements.clearCompletedBtn.addEventListener('click', () => {
          this.clearCompletedTasks();
        });
      }
    }

    bindKeyboardShortcuts() {
      document.addEventListener('keydown', (e) => {
        // 忽略输入框中的按键
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
          return;
        }

        switch(e.key) {
          case ' ':
            // 空格键：开始/暂停
            e.preventDefault();
            if (elements.startBtn) {
              elements.startBtn.click();
            }
            break;
          case 'r':
          case 'R':
            // R键：重置
            e.preventDefault();
            if (elements.resetBtn) {
              elements.resetBtn.click();
            }
            break;
          case '1':
            // 1键：切换到专注模式
            e.preventDefault();
            this.switchMode('pomodoro');
            break;
          case '2':
            // 2键：切换到短休息
            e.preventDefault();
            this.switchMode('short-break');
            break;
          case '3':
            // 3键：切换到长休息
            e.preventDefault();
            this.switchMode('long-break');
            break;
          case 't':
          case 'T':
            // T键：聚焦到任务输入框
            e.preventDefault();
            if (elements.newTaskInput) {
              elements.newTaskInput.focus();
            }
            break;
          case 'Escape':
            // ESC键：优先退出沉浸模式，否则取消输入
            e.preventDefault();
            if (elements.zenOverlay && elements.zenOverlay.classList.contains('active')) {
              this.toggleZen();
              return;
            }
            if (elements.newTaskInput && document.activeElement === elements.newTaskInput) {
              elements.newTaskInput.blur();
              elements.newTaskInput.value = '';
            }
            break;
        }
      });
    }

    addTaskFromInput() {
      const text = elements.newTaskInput.value.trim();
      const category = elements.taskCategory ? elements.taskCategory.value : 'general';
      if (text) {
        this.addTask(text, category);
        elements.newTaskInput.value = '';
        elements.newTaskInput.focus();
      }
    }

    /* ===== 数据管理方法 ===== */
    exportData() {
      const data = {
        tasks: this.tasks,
        history: this.history,
        stats: TimeHubUtils.getLocalStorage('timehub_pomodoro_stats', {}),
        settings: this.settings,
        whiteNoise: {
          sound: this.selectedSound,
          volume: this.volume
        },
        exportDate: new Date().toISOString(),
        version: '1.0'
      };

      const dataStr = JSON.stringify(data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timehub-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert('数据已导出为JSON文件');
    }

    importData() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';

      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);

            // 验证数据格式
            if (!data.version || !data.tasks || !data.settings) {
              throw new Error('无效的数据格式');
            }

            // 确认导入
            if (confirm('导入数据将覆盖当前数据，确定要导入吗？')) {
              // 导入数据
              this.tasks = data.tasks || [];
              this.history = data.history || [];
              this.settings = data.settings || {};
              this.selectedSound = data.whiteNoise?.sound || 'off';
              this.volume = data.whiteNoise?.volume ?? 0.5;

              // 保存到localStorage
              if (data.stats) {
                TimeHubUtils.setLocalStorage('timehub_pomodoro_stats', data.stats);
              }

              this.saveTasks();
              this.saveHistory();
              this.saveSettings();
              this.saveState();

              // 重新加载
              this.loadState();
              this.loadSettings();
              this.loadHistory();
              this.renderTasks();
              this.updateStats();
              this.updateDurationDisplays();
              this.initAmbient();

              alert('数据导入成功！');
            }
          } catch (error) {
            alert(`导入失败：${error.message}`);
          }
        };

        reader.readAsText(file);
      };

      input.click();
    }

    resetData() {
      if (confirm('确定要重置所有数据吗？此操作不可撤销！')) {
        // 清除所有localStorage数据
        TimeHubUtils.removeLocalStorage('timehub_tasks');
        TimeHubUtils.removeLocalStorage('timehub_history');
        TimeHubUtils.removeLocalStorage('timehub_settings');
        TimeHubUtils.removeLocalStorage('timehub_pomodoro_stats');
        TimeHubUtils.removeLocalStorage('timehub_white_noise');
        TimeHubUtils.removeLocalStorage('timehub_streak');

        // 重置内存状态
        this.tasks = [];
        this.history = [];
        this.totalTomatoes = 0;
        this.tomatoCount = 0;
        this.currentTaskId = null;
        this.settings = {
          pomodoroDuration: 25,
          shortBreakDuration: 5,
          longBreakDuration: 15,
          notifications: true,
          soundEnabled: true
        };
        this.selectedSound = 'off';
        this.volume = 0.5;

        // 重置UI
        this.renderTasks();
        this.updateStats();
        this.updateDurationDisplays();
        this.updateCurrentTaskInfo();
        this.stopAmb();

        alert('数据已重置！');
      }
    }

    /* ===== 设置UI初始化 ===== */
    initSettingsUI() {
      // 初始化通知开关
      if (elements.notificationToggle) {
        elements.notificationToggle.checked = this.settings.notifications;
      }

      // 初始化声音开关
      if (elements.soundToggle) {
        elements.soundToggle.checked = this.settings.soundEnabled;
      }
    }
  }

  /* ===== 初始化 ===== */
  // 等待DOM加载完成
  const initPomodoro = () => {
    try {
      console.log('正在初始化番茄钟...');
      window.pomodoroTimer = new PomodoroTimer();
      console.log('番茄钟初始化成功');
    } catch (error) {
      console.error('番茄钟初始化失败:', error);
      // 显示错误提示
      if (window.toast) {
        window.toast('番茄钟初始化失败，请刷新页面重试', 'error', 5000);
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPomodoro);
  } else {
    initPomodoro();
  }

})();
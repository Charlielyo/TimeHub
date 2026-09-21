/* TimeHub - 呼吸训练逻辑 */
/* 版本: 1.0 */

(function() {
  'use strict';

  // 呼吸训练状态
  const BreathingApp = {
    // DOM 元素
    elements: {},

    // 应用状态
    state: {
      // 当前模式: 'four-seven-eight', 'square', 'custom'
      currentMode: 'four-seven-eight',
      // 模式配置
      modes: {
        'four-seven-eight': {
          name: '4-7-8呼吸法',
          phases: [
            { type: 'inhale', duration: 4, label: '吸气' },
            { type: 'hold', duration: 7, label: '屏住' },
            { type: 'exhale', duration: 8, label: '呼气' }
          ]
        },
        'square': {
          name: '方形呼吸',
          phases: [
            { type: 'inhale', duration: 4, label: '吸气' },
            { type: 'hold', duration: 4, label: '屏住' },
            { type: 'exhale', duration: 4, label: '呼气' },
            { type: 'hold', duration: 4, label: '屏住' }
          ]
        },
        'custom': {
          name: '自定义呼吸',
          phases: [
            { type: 'inhale', duration: 4, label: '吸气' },
            { type: 'hold', duration: 7, label: '屏住' },
            { type: 'exhale', duration: 8, label: '呼气' },
            { type: 'hold', duration: 0, label: '屏住' }
          ]
        }
      },
      // 训练状态: 'idle', 'running', 'paused', 'completed'
      status: 'idle',
      // 当前轮次
      currentRound: 1,
      // 总轮数
      totalRounds: 3,
      // 当前阶段索引
      currentPhaseIndex: 0,
      // 当前阶段剩余时间（秒）
      currentPhaseTime: 0,
      // 阶段计时器
      phaseTimer: null,
      // 总训练时间（秒）
      totalTime: 0,
      // 开始时间戳
      startTimestamp: 0,
      // 暂停时累计时间
      pausedAccumulatedTime: 0,
      // 音效开关
      soundEnabled: true,
      // 音效上下文
      audioContext: null,
      // 音效振荡器
      oscillators: []
    },

    // 初始化
    init: function() {
      this.cacheElements();
      this.bindEvents();
      this.loadSettings();
      this.updateModeDisplay();
      this.updateRoundDisplay();
    },

    // 缓存DOM元素
    cacheElements: function() {
      this.elements = {
        // 模式选择
        modeCards: document.querySelectorAll('.mode-card'),
        modeSelectBtns: document.querySelectorAll('.mode-select-btn'),
        customInputs: {
          inhale: document.querySelector('.inhale-input'),
          hold: document.querySelector('.hold-input'),
          exhale: document.querySelector('.exhale-input'),
          hold2: document.querySelector('.hold2-input')
        },

        // 主视图
        modeSelection: document.querySelector('.mode-selection'),
        breathingView: document.getElementById('breathing-view'),
        currentModeTitle: document.getElementById('current-mode-title'),
        currentModeDisplay: document.getElementById('current-mode-display'),
        currentDuration: document.getElementById('current-duration'),

        // 进度指示
        currentRound: document.getElementById('current-round'),
        totalRounds: document.getElementById('total-rounds'),

        // 呼吸圆圈
        breathingCircle: document.getElementById('breathing-circle'),
        currentPhase: document.getElementById('current-phase'),
        timeCount: document.getElementById('time-count'),
        progressRingFill: document.querySelector('.progress-ring-fill'),

        // 控制区
        startPauseBtn: document.getElementById('start-pause-btn'),
        resetBtn: document.getElementById('reset-btn'),
        roundsInput: document.getElementById('rounds-input'),
        roundsMinus: document.getElementById('rounds-minus'),
        roundsPlus: document.getElementById('rounds-plus'),
        soundToggle: document.getElementById('sound-toggle'),

        // 完成屏幕
        completionScreen: document.getElementById('completion-screen'),
        completionTime: document.getElementById('completion-time'),
        completionRounds: document.getElementById('completion-rounds'),
        completionMessage: document.getElementById('completion-message'),
        restartBtn: document.getElementById('restart-btn'),
        backToModesBtn: document.getElementById('back-to-modes-btn')
      };
    },

    // 绑定事件
    bindEvents: function() {
      // 模式选择
      this.elements.modeSelectBtns.forEach(btn => {
        btn.addEventListener('click', (e) => this.selectMode(e));
      });

      // 自定义输入变化
      Object.values(this.elements.customInputs).forEach(input => {
        input.addEventListener('change', () => this.updateCustomMode());
        input.addEventListener('input', () => this.updateCustomMode());
      });

      // 控制按钮
      this.elements.startPauseBtn.addEventListener('click', () => this.toggleStartPause());
      this.elements.resetBtn.addEventListener('click', () => this.resetTraining());

      // 轮数调整
      this.elements.roundsMinus.addEventListener('click', () => this.adjustRounds(-1));
      this.elements.roundsPlus.addEventListener('click', () => this.adjustRounds(1));
      this.elements.roundsInput.addEventListener('change', () => this.updateRoundsFromInput());

      // 音效开关
      this.elements.soundToggle.addEventListener('change', () => {
        this.state.soundEnabled = this.elements.soundToggle.checked;
        this.saveSettings();
      });

      // 完成屏幕按钮
      this.elements.restartBtn.addEventListener('click', () => this.restartTraining());
      this.elements.backToModesBtn.addEventListener('click', () => this.showModeSelection());

      // 键盘快捷键
      document.addEventListener('keydown', (e) => this.handleKeydown(e));
    },

    // 选择模式
    selectMode: function(event) {
      const mode = event.currentTarget.dataset.mode;
      this.state.currentMode = mode;

      // 更新自定义模式配置
      if (mode === 'custom') {
        this.updateCustomMode();
      }

      // 切换到主视图
      this.showBreathingView();

      // 更新显示
      this.updateModeDisplay();
      this.updateRoundDisplay();
      this.saveSettings();
    },

    // 更新自定义模式
    updateCustomMode: function() {
      const inhale = parseInt(this.elements.customInputs.inhale.value) || 4;
      const hold = parseInt(this.elements.customInputs.hold.value) || 0;
      const exhale = parseInt(this.elements.customInputs.exhale.value) || 4;
      const hold2 = parseInt(this.elements.customInputs.hold2.value) || 0;

      // 限制范围
      const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

      this.state.modes.custom.phases = [
        { type: 'inhale', duration: clamp(inhale, 1, 30), label: '吸气' },
        { type: 'hold', duration: clamp(hold, 0, 30), label: '屏住' },
        { type: 'exhale', duration: clamp(exhale, 1, 30), label: '呼气' },
        { type: 'hold', duration: clamp(hold2, 0, 30), label: '屏住' }
      ];

      // 更新显示
      if (this.state.currentMode === 'custom') {
        this.updateModeDisplay();
      }
    },

    // 显示呼吸视图
    showBreathingView: function() {
      this.elements.modeSelection.style.display = 'none';
      this.elements.breathingView.style.display = 'block';
      this.elements.completionScreen.style.display = 'none';
    },

    // 显示模式选择
    showModeSelection: function() {
      this.elements.modeSelection.style.display = 'block';
      this.elements.breathingView.style.display = 'none';
      this.resetTraining();
    },

    // 更新模式显示
    updateModeDisplay: function() {
      const mode = this.state.modes[this.state.currentMode];
      const totalSeconds = mode.phases.reduce((sum, phase) => sum + phase.duration, 0);

      // 更新标题和显示
      this.elements.currentModeTitle.textContent = mode.name;
      this.elements.currentModeDisplay.textContent = mode.name;
      this.elements.currentDuration.textContent = `${totalSeconds}秒/轮`;

      // 更新自定义输入显示
      if (this.state.currentMode === 'custom') {
        const phases = mode.phases;
        this.elements.customInputs.inhale.value = phases[0].duration;
        this.elements.customInputs.hold.value = phases[1].duration;
        this.elements.customInputs.exhale.value = phases[2].duration;
        this.elements.customInputs.hold2.value = phases[3]?.duration || 0;
      }
    },

    // 调整轮数
    adjustRounds: function(delta) {
      let newRounds = this.state.totalRounds + delta;
      newRounds = Math.max(1, Math.min(20, newRounds));

      this.state.totalRounds = newRounds;
      this.elements.roundsInput.value = newRounds;
      this.updateRoundDisplay();
      this.saveSettings();
    },

    // 从输入更新轮数
    updateRoundsFromInput: function() {
      let newRounds = parseInt(this.elements.roundsInput.value) || 3;
      newRounds = Math.max(1, Math.min(20, newRounds));

      this.state.totalRounds = newRounds;
      this.elements.roundsInput.value = newRounds;
      this.updateRoundDisplay();
      this.saveSettings();
    },

    // 更新轮数显示
    updateRoundDisplay: function() {
      this.elements.currentRound.textContent = this.state.currentRound;
      this.elements.totalRounds.textContent = this.state.totalRounds;
    },

    // 开始/暂停切换
    toggleStartPause: function() {
      if (this.state.status === 'idle' || this.state.status === 'paused') {
        this.startTraining();
      } else if (this.state.status === 'running') {
        this.pauseTraining();
      }
    },

    // 开始训练
    startTraining: function() {
      if (this.state.status === 'idle') {
        // 首次开始
        this.state.startTimestamp = Date.now();
        this.state.pausedAccumulatedTime = 0;
        this.state.totalTime = 0;
        this.state.currentRound = 1;
        this.state.currentPhaseIndex = 0;

        // 初始化音频上下文（如果可用）
        if (this.state.soundEnabled && !this.state.audioContext) {
          this.initAudioContext();
        }
      } else if (this.state.status === 'paused') {
        // 从暂停恢复
        this.state.startTimestamp = Date.now() - this.state.pausedAccumulatedTime;
      }

      this.state.status = 'running';
      this.updateControlButtons();
      this.startPhase();
    },

    // 暂停训练
    pauseTraining: function() {
      if (this.state.status !== 'running') return;

      this.state.status = 'paused';
      this.state.pausedAccumulatedTime = Date.now() - this.state.startTimestamp;
      this.stopPhaseTimer();
      this.updateControlButtons();

      // 停止所有音效
      this.stopAllSounds();
    },

    // 重置训练
    resetTraining: function() {
      this.stopPhaseTimer();
      this.stopAllSounds();

      this.state.status = 'idle';
      this.state.currentRound = 1;
      this.state.currentPhaseIndex = 0;
      this.state.currentPhaseTime = 0;
      this.state.totalTime = 0;
      this.state.pausedAccumulatedTime = 0;

      this.updateControlButtons();
      this.updateRoundDisplay();
      this.resetCircleAnimation();
      this.updatePhaseDisplay('准备开始', '--');
    },

    // 开始当前阶段
    startPhase: function() {
      const mode = this.state.modes[this.state.currentMode];
      const phase = mode.phases[this.state.currentPhaseIndex];

      if (!phase) {
        this.completeRound();
        return;
      }

      this.state.currentPhaseTime = phase.duration;
      this.updatePhaseDisplay(phase.label, phase.duration);
      this.updateCircleAnimation(phase.type);
      this.updateProgressRing(1); // 初始满进度

      // 播放阶段开始音效
      if (this.state.soundEnabled && this.state.audioContext) {
        this.playPhaseSound(phase.type);
      }

      // 启动计时器
      this.state.phaseTimer = setInterval(() => {
        this.state.currentPhaseTime--;

        // 更新显示
        this.updatePhaseDisplay(phase.label, this.state.currentPhaseTime);

        // 更新进度环
        const progress = this.state.currentPhaseTime / phase.duration;
        this.updateProgressRing(progress);

        // 阶段结束
        if (this.state.currentPhaseTime <= 0) {
          clearInterval(this.state.phaseTimer);
          this.nextPhase();
        }
      }, 1000);
    },

    // 停止阶段计时器
    stopPhaseTimer: function() {
      if (this.state.phaseTimer) {
        clearInterval(this.state.phaseTimer);
        this.state.phaseTimer = null;
      }
    },

    // 进入下一阶段
    nextPhase: function() {
      const mode = this.state.modes[this.state.currentMode];
      this.state.currentPhaseIndex++;

      if (this.state.currentPhaseIndex < mode.phases.length) {
        this.startPhase();
      } else {
        this.completeRound();
      }
    },

    // 完成一轮
    completeRound: function() {
      this.state.currentPhaseIndex = 0;
      this.state.currentRound++;

      if (this.state.currentRound <= this.state.totalRounds) {
        this.updateRoundDisplay();
        this.startPhase();
      } else {
        this.completeTraining();
      }
    },

    // 完成训练
    completeTraining: function() {
      this.state.status = 'completed';
      this.state.totalTime = Date.now() - this.state.startTimestamp;

      this.stopPhaseTimer();
      this.stopAllSounds();
      this.updateControlButtons();
      this.showCompletionScreen();
      this.saveSession();
    },

    // 重新开始训练
    restartTraining: function() {
      this.resetTraining();
      this.startTraining();
    },

    // 更新控制按钮状态
    updateControlButtons: function() {
      const startPauseBtn = this.elements.startPauseBtn;
      const resetBtn = this.elements.resetBtn;

      if (this.state.status === 'running') {
        startPauseBtn.querySelector('.btn-icon').textContent = '⏸️';
        startPauseBtn.querySelector('.btn-text').textContent = '暂停';
        resetBtn.disabled = false;
      } else if (this.state.status === 'paused') {
        startPauseBtn.querySelector('.btn-icon').textContent = '▶️';
        startPauseBtn.querySelector('.btn-text').textContent = '继续';
        resetBtn.disabled = false;
      } else {
        startPauseBtn.querySelector('.btn-icon').textContent = '▶️';
        startPauseBtn.querySelector('.btn-text').textContent = '开始';
        resetBtn.disabled = true;
      }
    },

    // 更新呼吸圆圈动画
    updateCircleAnimation: function(phaseType) {
      const circle = this.elements.breathingCircle;
      const progressRing = this.elements.progressRingFill;

      // 移除所有类
      circle.classList.remove('inhale', 'hold', 'exhale');
      circle.classList.add(phaseType);

      // 更新进度环颜色
      switch (phaseType) {
        case 'inhale':
          progressRing.style.stroke = 'var(--breathing-inhale-color)';
          break;
        case 'hold':
          progressRing.style.stroke = 'var(--breathing-hold-color)';
          break;
        case 'exhale':
          progressRing.style.stroke = 'var(--breathing-exhale-color)';
          break;
      }
    },

    // 重置圆圈动画
    resetCircleAnimation: function() {
      const circle = this.elements.breathingCircle;
      const progressRing = this.elements.progressRingFill;

      circle.classList.remove('inhale', 'hold', 'exhale');
      progressRing.style.stroke = 'var(--breathing-inhale-color)';
      this.updateProgressRing(1);
    },

    // 更新进度环
    updateProgressRing: function(progress) {
      const progressRing = this.elements.progressRingFill;
      const circumference = 879.65; // 2 * π * 140
      const offset = circumference * (1 - progress);

      progressRing.style.strokeDashoffset = offset;
    },

    // 更新阶段显示
    updatePhaseDisplay: function(phaseName, time) {
      this.elements.currentPhase.textContent = phaseName;
      this.elements.timeCount.textContent = time === '--' ? time : time.toString().padStart(2, '0');
    },

    // 显示完成屏幕
    showCompletionScreen: function() {
      // 计算用时
      const minutes = Math.floor(this.state.totalTime / 60000);
      const seconds = Math.floor((this.state.totalTime % 60000) / 1000);
      const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      // 鼓励语
      const messages = [
        '很棒！您已经完成了一次完整的呼吸训练。',
        '做得好！坚持呼吸训练有助于提升身心健康。',
        '恭喜完成！您的专注力正在不断提升。',
        '非常好！继续坚持呼吸练习，感受内心的平静。',
        '训练完成！深呼吸让您更加放松和专注。'
      ];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];

      // 更新显示
      this.elements.completionTime.textContent = timeStr;
      this.elements.completionRounds.textContent = this.state.totalRounds;
      this.elements.completionMessage.textContent = randomMessage;

      this.elements.completionScreen.style.display = 'flex';
    },

    // 初始化音频上下文
    initAudioContext: function() {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.state.audioContext = new AudioContext();
      } catch (error) {
        console.warn('音频上下文初始化失败，音效将不可用:', error);
        this.state.soundEnabled = false;
        this.elements.soundToggle.checked = false;
        this.elements.soundToggle.disabled = true;
      }
    },

    // 播放阶段音效
    playPhaseSound: function(phaseType) {
      if (!this.state.audioContext || this.state.audioContext.state === 'suspended') {
        this.state.audioContext?.resume();
      }

      const oscillator = this.state.audioContext.createOscillator();
      const gainNode = this.state.audioContext.createGain();

      // 设置频率
      switch (phaseType) {
        case 'inhale':
          oscillator.frequency.value = 440; // A4 (高音)
          break;
        case 'hold':
          oscillator.frequency.value = 329.63; // E4 (中音)
          break;
        case 'exhale':
          oscillator.frequency.value = 261.63; // C4 (低音)
          break;
      }

      // 设置音色和音量
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;

      // 连接节点
      oscillator.connect(gainNode);
      gainNode.connect(this.state.audioContext.destination);

      // 淡入淡出
      const now = this.state.audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.5);

      // 播放
      oscillator.start(now);
      oscillator.stop(now + 0.5);

      // 保存引用
      this.state.oscillators.push(oscillator);

      // 清理
      oscillator.onended = () => {
        const index = this.state.oscillators.indexOf(oscillator);
        if (index > -1) {
          this.state.oscillators.splice(index, 1);
        }
      };
    },

    // 停止所有音效
    stopAllSounds: function() {
      this.state.oscillators.forEach(oscillator => {
        try {
          oscillator.stop();
        } catch (error) {
          // 忽略已停止的振荡器
        }
      });
      this.state.oscillators = [];
    },

    // 处理键盘事件
    handleKeydown: function(event) {
      if (event.target.tagName === 'INPUT') return;

      switch (event.code) {
        case 'Space':
          event.preventDefault();
          this.toggleStartPause();
          break;
        case 'KeyR':
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            this.resetTraining();
          }
          break;
        case 'Escape':
          if (this.state.status === 'completed') {
            this.showModeSelection();
          }
          break;
      }
    },

    // 保存设置
    saveSettings: function() {
      const settings = {
        currentMode: this.state.currentMode,
        totalRounds: this.state.totalRounds,
        soundEnabled: this.state.soundEnabled,
        customMode: this.state.modes.custom
      };

      TimeHubUtils.setLocalStorage('timehub_breathing_settings', settings);
    },

    // 加载设置
    loadSettings: function() {
      const settings = TimeHubUtils.getLocalStorage('timehub_breathing_settings', {});

      if (settings.currentMode) {
        this.state.currentMode = settings.currentMode;
      }

      if (settings.totalRounds) {
        this.state.totalRounds = settings.totalRounds;
        this.elements.roundsInput.value = this.state.totalRounds;
      }

      if (settings.soundEnabled !== undefined) {
        this.state.soundEnabled = settings.soundEnabled;
        this.elements.soundToggle.checked = this.state.soundEnabled;
      }

      if (settings.customMode) {
        this.state.modes.custom = settings.customMode;
      }
    },

    // 保存训练会话
    saveSession: function() {
      const sessions = TimeHubUtils.getLocalStorage('timehub_breathing_sessions', []);
      const session = {
        date: new Date().toISOString(),
        mode: this.state.currentMode,
        rounds: this.state.totalRounds,
        duration: this.state.totalTime,
        modeName: this.state.modes[this.state.currentMode].name
      };

      sessions.unshift(session); // 添加到开头
      if (sessions.length > 50) sessions.length = 50; // 限制数量

      TimeHubUtils.setLocalStorage('timehub_breathing_sessions', sessions);
    }
  };

  // 页面加载完成后初始化
  window.addEventListener('DOMContentLoaded', () => {
    BreathingApp.init();
  });

  // 全局暴露
  window.BreathingApp = BreathingApp;
})();
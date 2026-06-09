/**
 * UI 渲染器 — 根据游戏状态更新 DOM
 */
class UIRenderer {
  constructor() {
    this.elements = {};
    this.initialized = false;
  }

  /**
   * 延迟初始化 DOM 元素（确保 DOM 已加载）
   */
  init() {
    if (this.initialized) return;

    this.screens = {
      lobby: document.getElementById('screen-lobby'),
      game: document.getElementById('screen-game'),
      gameover: document.getElementById('screen-gameover'),
    };

    this.elements = {
      joinBtn: document.getElementById('btn-join-queue'),
      queueStatus: document.getElementById('queue-status'),
      handCards: document.getElementById('hand-cards'),
      playerFieldCard: document.getElementById('player-field-card'),
      opponentFieldCard: document.getElementById('opponent-field-card'),
      playerFieldStats: document.getElementById('player-field-stats'),
      opponentHandCount: document.getElementById('opponent-hand-count'),
      battleLog: document.getElementById('battle-log'),
      rpsSection: document.getElementById('rps-section'),
      actionSection: document.getElementById('action-section'),
      poisonSection: document.getElementById('poison-section'),
      poisonTargets: document.getElementById('poison-targets'),
      reviveSection: document.getElementById('revive-section'),
      reviveTargets: document.getElementById('revive-targets'),
      gameoverTitle: document.getElementById('gameover-title'),
      gameoverReason: document.getElementById('gameover-reason'),
      playAgainBtn: document.getElementById('btn-play-again'),
    };

    this.initialized = true;
  }

  /**
   * 获取 DOM 元素（延迟加载）
   */
  getElement(key) {
    if (!this.initialized) this.init();
    return this.elements[key];
  }

  // === 界面管理 ===
  showScreen(name) {
    if (!this.initialized) this.init();
    Object.values(this.screens).forEach(s => {
      s.classList.remove('active');
      s.classList.add('hidden');
    });
    if (this.screens[name]) {
      this.screens[name].classList.remove('hidden');
      this.screens[name].classList.add('active');
    }
  }

  // === 大厅 ===
  showQueueStatus(show) {
    const queueStatus = this.getElement('queueStatus');
    const joinBtn = this.getElement('joinBtn');
    if (queueStatus) queueStatus.classList.toggle('hidden', !show);
    if (joinBtn) joinBtn.classList.toggle('hidden', show);
  }

  // === 手牌 ===
  renderHand(cards, onCardClick) {
    const handCards = this.getElement('handCards');
    if (!handCards) return;
    handCards.innerHTML = '';

    cards.forEach(card => {
      const el = document.createElement('div');
      el.className = `hand-card ${card.category}`;
      el.dataset.cardId = card.id;

      const stats = CHARACTER_STATS[card.type] || { name: card.name, hp: card.hp, atk: card.atk };
      const isDual = card.category === 'dual';
      const isSkill = card.category === 'skill';

      el.innerHTML = `
        <span class="card-type-badge">${isDual ? '双用' : isSkill ? '技能' : card.category === 'character' ? '角色' : '技能'}</span>
        <span class="card-name">${card.name}</span>
        ${stats.hp ? `
          <div class="card-stats">
            <span class="hp">♥${stats.hp}</span>
            <span class="atk">⚔${stats.atk}</span>
          </div>
        ` : ''}
        ${card.skill ? `<div class="card-skill">【${SKILL_DESC[card.skill]?.name || card.skill}】</div>` : ''}
        ${card.skillCard ? `<div class="card-skill">技能：${SKILL_EFFECTS[card.skillCard]?.name || card.skillCard}</div>` : ''}
      `;

      el.addEventListener('click', () => onCardClick(card));
      handCards.appendChild(el);
    });
  }

  selectCard(cardId) {
    document.querySelectorAll('.hand-card').forEach(el => {
      el.classList.toggle('selected', el.dataset.cardId === cardId);
    });
  }

  clearCardSelection() {
    document.querySelectorAll('.hand-card').forEach(el => {
      el.classList.remove('selected');
    });
  }

  // === 场上卡牌 ===
  renderFieldCard(elementKey, character, faceDown = false) {
    const el = this.getElement(elementKey);
    if (!el) {
      console.error(`Element not found: ${elementKey}`);
      return;
    }
    if (!character) {
      el.className = 'field-card empty';
      el.innerHTML = '<span class="card-placeholder">?</span>';
      return;
    }

    if (faceDown) {
      el.className = 'field-card face-down';
      el.innerHTML = '';
    } else {
      el.className = 'field-card face-up';
      el.innerHTML = `
        <span class="card-name">${character.name}</span>
        <span class="card-hp">♥ ${character.currentHp}/${character.maxHp}</span>
        <span class="card-atk">⚔ ${character.atk}</span>
        ${character.skill ? `<span class="card-skill" style="font-size:0.65rem;color:#a78bfa;">${SKILL_DESC[character.skill]?.name || ''}</span>` : ''}
      `;
    }
  }

  renderMyField(character) {
    this.renderFieldCard('playerFieldCard', character);
    // 同时更新下方统计
    const playerFieldStats = this.getElement('playerFieldStats');
    if (playerFieldStats) {
      if (character) {
        playerFieldStats.innerHTML = `
          <span style="color:#e94560">♥${character.currentHp}/${character.maxHp}</span>
          <span style="color:#f5a623">⚔${character.atk}</span>
        `;
      } else {
        playerFieldStats.innerHTML = '';
      }
    }
  }

  renderOpponentField(character, faceDown = false) {
    this.renderFieldCard('opponentFieldCard', character, faceDown);
  }

  updateOpponentHandCount(count) {
    const opponentHandCount = this.getElement('opponentHandCount');
    if (opponentHandCount) opponentHandCount.textContent = count;
  }

  // === 战斗日志 ===
  addLog(message, important = false) {
    const battleLog = this.getElement('battleLog');
    if (!battleLog) return;
    const entry = document.createElement('p');
    entry.className = `log-entry${important ? ' important' : ''}`;
    entry.textContent = message;
    battleLog.appendChild(entry);
    battleLog.scrollTop = battleLog.scrollHeight;
  }

  clearLog() {
    const battleLog = this.getElement('battleLog');
    if (battleLog) battleLog.innerHTML = '';
  }

  // === 石头剪刀布 ===
  showRPS(show) {
    const rpsSection = this.getElement('rpsSection');
    if (rpsSection) rpsSection.classList.toggle('hidden', !show);
  }

  highlightRPS(choice) {
    document.querySelectorAll('.rps-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.choice === choice);
    });
  }

  clearRPSHighlight() {
    document.querySelectorAll('.rps-btn').forEach(btn => {
      btn.classList.remove('selected');
    });
  }

  // === 行动选择 ===
  showActions(show, availableActions = []) {
    const actionSection = this.getElement('actionSection');
    if (actionSection) actionSection.classList.toggle('hidden', !show);
    if (show) {
      document.querySelectorAll('.action-btn').forEach(btn => {
        const action = btn.dataset.action;
        btn.disabled = !availableActions.includes(action);
        btn.style.opacity = availableActions.includes(action) ? '1' : '0.4';
      });
    }
  }

  // === 目标选择 ===
  showPoisonTarget(targets, onSelect) {
    const poisonSection = this.getElement('poisonSection');
    const poisonTargets = this.getElement('poisonTargets');
    if (poisonSection) poisonSection.classList.remove('hidden');
    if (poisonTargets) {
      poisonTargets.innerHTML = '';
      targets.forEach(t => {
        const btn = document.createElement('button');
        btn.className = 'target-btn';
        btn.textContent = `${t.name} (♥${t.hp})`;
        btn.addEventListener('click', () => onSelect(t));
        poisonTargets.appendChild(btn);
      });
    }
  }

  hidePoisonTarget() {
    const poisonSection = this.getElement('poisonSection');
    if (poisonSection) poisonSection.classList.add('hidden');
  }

  showReviveTarget(targets, onSelect) {
    const reviveSection = this.getElement('reviveSection');
    const reviveTargets = this.getElement('reviveTargets');
    if (reviveSection) reviveSection.classList.remove('hidden');
    if (reviveTargets) {
      reviveTargets.innerHTML = '';
      targets.forEach(t => {
        const btn = document.createElement('button');
        btn.className = 'target-btn';
        btn.textContent = t.name;
        btn.addEventListener('click', () => onSelect(t));
        reviveTargets.appendChild(btn);
      });
    }
  }

  hideReviveTarget() {
    const reviveSection = this.getElement('reviveSection');
    if (reviveSection) reviveSection.classList.add('hidden');
  }

  // === 游戏结束 ===
  showGameOver(isWin, reason) {
    this.showScreen('gameover');
    const gameoverTitle = this.getElement('gameoverTitle');
    const gameoverReason = this.getElement('gameoverReason');
    if (gameoverTitle) {
      gameoverTitle.textContent = isWin ? '🎉 你赢了！' : '💀 你输了';
      gameoverTitle.className = `gameover-title ${isWin ? 'win' : 'lose'}`;
    }
    const reasonTexts = {
      all_characters_lost: '对方所有角色牌已被消耗',
      opponent_disconnected: '对手断开连接',
    };
    if (gameoverReason) gameoverReason.textContent = reasonTexts[reason] || reason;
  }

  // === 牌库说明面板 ===
  setupDeckPanel() {
    const toggleBtn = document.getElementById('btn-toggle-deck');
    const content = document.getElementById('deck-content');

    if (toggleBtn && content) {
      toggleBtn.addEventListener('click', () => {
        content.classList.toggle('hidden');
        toggleBtn.textContent = content.classList.contains('hidden') ? '📚 牌库说明' : '✕ 关闭说明';
      });
    }
  }

  // === 隐藏所有交互区域 ===
  hideAllSections() {
    this.showRPS(false);
    this.showActions(false);
    this.hidePoisonTarget();
    this.hideReviveTarget();
  }
}

const ui = new UIRenderer();

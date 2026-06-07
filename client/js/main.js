/**
 * 主入口 — 将 socket 事件连接到 UI 和游戏状态
 */
(function () {
  // 连接 socket
  socketManager.connect();

  // 设置牌库说明面板
  ui.setupDeckPanel();

  // === 大厅 ===
  ui.elements.joinBtn.addEventListener('click', () => {
    socketManager.joinQueue();
    ui.showQueueStatus(true);
  });

  socketManager.on('queue_joined', () => {
    ui.showQueueStatus(true);
  });

  // === 游戏开始 ===
  socketManager.on('game_start', (data) => {
    gameState.setGameStart(data);
    ui.showScreen('game');
    ui.clearLog();
    ui.addLog('游戏开始！从牌库中各抽 6 张牌。', true);
    ui.renderHand(gameState.myHand, onHandCardClick);
    ui.renderMyField(null);
    ui.renderOpponentField(null);
    ui.updateOpponentHandCount(data.opponentHandCount);
    ui.hideAllSections();
  });

  // === 回合开始 ===
  socketManager.on('round_start', (data) => {
    gameState.round = data.round;
    gameState.phase = 'deploy';
    gameState.revealedCard = null;
    ui.hideAllSections();
    ui.clearCardSelection();
    ui.addLog(`--- 第 ${data.round} 回合 ---`, true);
    ui.addLog('请选择一张牌暗置到场上。');
    ui.renderOpponentField(null); // 重置对手场上显示
    ui.renderHand(gameState.myHand, onHandCardClick);
  });

  // === 部署 ===
  function onHandCardClick(card) {
    if (gameState.phase !== 'deploy') return;

    // 如果玩家场上没有角色，必须部署角色/双用牌
    if (!gameState.myField) {
      if (card.category !== 'character' && card.category !== 'dual') {
        ui.addLog('你还没有场上角色，请先部署一张角色牌。');
        return;
      }
    }

    ui.selectCard(card.id);
    gameState.revealedCard = card;
    socketManager.deployCard(card.id);
  }

  socketManager.on('deploy_success', (data) => {
    const card = gameState.revealedCard;
    if (!card) return;

    if (!gameState.myField && (card.category === 'character' || card.category === 'dual')) {
      gameState.addCardToField(card);
      ui.renderMyField(gameState.myField);
    }
    gameState.removeFromHand(card.id);
    ui.renderHand(gameState.myHand, onHandCardClick);
    ui.addLog(`你暗置了一张牌。`);
    ui.clearCardSelection();
  });

  // === 揭示 ===
  socketManager.on('cards_revealed', (data) => {
    gameState.phase = 'reveal';

    // 显示对手部署的牌
    if (data.opponentCard) {
      ui.addLog(`对手暗置了：${data.opponentCard.name}`);

      // 如果对手部署了角色，更新他们的场上
      if (data.opponentCard.category === 'character' || data.opponentCard.category === 'dual') {
        const stats = CHARACTER_STATS[data.opponentCard.type];
        gameState.opponentField = {
          ...data.opponentCard,
          maxHp: stats.hp,
          currentHp: stats.hp,
          atk: stats.atk,
        };
        ui.renderOpponentField(gameState.opponentField);
      }
    }
  });

  // === 石头剪刀布 ===
  socketManager.on('rps_start', (data) => {
    gameState.phase = 'rps';
    ui.hideAllSections();
    ui.showRPS(true);
    ui.addLog(data.message || '石头剪刀布！');
  });

  // 石头剪刀布按钮点击
  document.querySelectorAll('.rps-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (gameState.phase !== 'rps') return;
      const choice = btn.dataset.choice;
      socketManager.rpsChoice(choice);
      ui.highlightRPS(choice);
      ui.addLog(`你选择了 ${choice === 'rock' ? '✊石头' : choice === 'scissors' ? '✌️剪刀' : '🖐️布'}`);
    });
  });

  socketManager.on('opponent_rps_ready', () => {
    ui.addLog('对手已选择，等待揭晓...');
  });

  socketManager.on('rps_result', (data) => {
    if (data.result === 'draw') {
      ui.addLog('平局！重新来过！');
      ui.clearRPSHighlight();
      return;
    }

    const isWinner = data.winner === socketManager.socket.id;
    ui.addLog(isWinner ? '🎉 你赢了石头剪刀布！' : '😤 对手赢了石头剪刀布...', !isWinner);
    ui.clearRPSHighlight();
  });

  // === 行动阶段 ===
  socketManager.on('your_turn', (data) => {
    gameState.phase = 'action';
    gameState.isMyTurn = true;
    ui.hideAllSections();

    // 确定可用行动
    const actions = [];
    if (gameState.myField && gameState.myField.currentHp > 0) {
      actions.push('attack');
    }
    if (gameState.hasSkillCards()) {
      actions.push('skill');
    }
    if (gameState.getCharacterCards().length > 0) {
      actions.push('swap');
    }

    ui.showActions(true, actions);
    ui.addLog(data.message || '你的回合！选择行动。', true);
  });

  socketManager.on('opponent_turn', (data) => {
    gameState.isMyTurn = false;
    ui.hideAllSections();
    ui.addLog(data.message || '对方回合中...');
  });

  // 行动按钮点击
  document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (gameState.phase !== 'action' || !gameState.isMyTurn) return;

      const action = btn.dataset.action;

      if (action === 'attack') {
        socketManager.performAction('attack');
        ui.addLog('你发动了攻击！');
        ui.showActions(false);

      } else if (action === 'skill') {
        // 显示技能牌供选择
        const skillCards = gameState.myHand.filter(c => c.skillCard);
        if (skillCards.length === 0) {
          ui.addLog('没有可用的技能牌。');
          return;
        }
        // 渲染手牌，只显示可选的技能牌
        ui.addLog('选择一张技能牌使用：');
        renderSkillCardSelection(skillCards);

      } else if (action === 'swap') {
        // 显示角色牌供换角色选择
        const charCards = gameState.getCharacterCards();
        if (charCards.length === 0) {
          ui.addLog('没有可替换的角色牌。');
          return;
        }
        ui.addLog('选择一张角色牌替换场上角色：');
        renderSwapCardSelection(charCards);
      }
    });
  });

  function renderSkillCardSelection(cards) {
    ui.elements.handCards.innerHTML = '';
    cards.forEach(card => {
      const el = document.createElement('div');
      el.className = `hand-card ${card.category} selected`;
      el.innerHTML = `
        <span class="card-name">${card.name}</span>
        <div class="card-skill">技能：${SKILL_EFFECTS[card.skillCard]?.name || card.skillCard}</div>
      `;
      el.addEventListener('click', () => {
        socketManager.performAction('skill', card.id);
        ui.addLog(`你使用了 ${card.name} 的技能！`);
        ui.showActions(false);
        ui.renderHand(gameState.myHand, onHandCardClick);
      });
      ui.elements.handCards.appendChild(el);
    });
  }

  function renderSwapCardSelection(cards) {
    ui.elements.handCards.innerHTML = '';
    cards.forEach(card => {
      const el = document.createElement('div');
      el.className = `hand-card ${card.category} selected`;
      const stats = CHARACTER_STATS[card.type];
      el.innerHTML = `
        <span class="card-name">${card.name}</span>
        <div class="card-stats">
          <span class="hp">♥${stats.hp}</span>
          <span class="atk">⚔${stats.atk}</span>
        </div>
      `;
      el.addEventListener('click', () => {
        socketManager.performAction('swap', card.id);
        ui.addLog(`你将场上角色替换为 ${card.name}。`);
        ui.showActions(false);
        ui.renderHand(gameState.myHand, onHandCardClick);
      });
      ui.elements.handCards.appendChild(el);
    });
  }

  // === 行动结果 ===
  socketManager.on('action_result', (data) => {
    if (data.type === 'attack') {
      const result = data.result;
      const isAttacker = data.attacker === socketManager.socket.id;

      ui.addLog(`${result.attacker} 攻击了 ${result.defender}！`);

      if (result.damage > 0) {
        ui.addLog(`造成 ${result.damage} 点伤害！`);
      }

      result.effects.forEach(effect => {
        ui.addLog(effect.message, effect.type === 'death');
      });

      // 更新场上显示
      updateFieldDisplays();

    } else if (data.type === 'skill') {
      ui.addLog(data.result.message || '技能发动！', true);

      if (data.result.type === 'shield') {
        // 守卫盾激活
      } else if (data.result.type === 'reveal') {
        // 预言家天眼 - 显示对手手牌
        ui.addLog(`对方手牌：${data.result.hand.map(c => c.name).join('、')}`, true);
      } else if (data.result.type === 'revive') {
        ui.addLog(`${data.result.card.name} 已复活！`);
      }
    } else if (data.type === 'swap') {
      ui.addLog(`${data.playerId === socketManager.socket.id ? '你' : '对手'} 换上了 ${data.newCharacter.name}！`);

      if (data.playerId === socketManager.socket.id) {
        const stats = CHARACTER_STATS[data.newCharacter.type];
        gameState.myField = {
          type: data.newCharacter.type,
          name: data.newCharacter.name,
          maxHp: data.newCharacter.maxHp || stats.hp,
          currentHp: data.newCharacter.hp || stats.hp,
          atk: data.newCharacter.atk || stats.atk,
        };
        ui.renderMyField(gameState.myField);
      }
    }

    // 行动后恢复手牌显示
    setTimeout(() => {
      ui.renderHand(gameState.myHand, onHandCardClick);
    }, 500);
  });

  // === 死亡技能 ===
  socketManager.on('death_skill', (data) => {
    ui.addLog(data.message, true);
    updateFieldDisplays();
  });

  // === 复活目标选择 ===
  socketManager.on('select_revive_target', (data) => {
    ui.showReviveTarget(data.lost, (target) => {
      socketManager.selectReviveTarget(data.cardId, target.id);
      ui.hideReviveTarget();
    });
  });

  // === 游戏结束 ===
  socketManager.on('game_over', (data) => {
    const isWin = data.winner === socketManager.socket.id;
    gameState.phase = 'gameover';
    ui.showGameOver(isWin, data.reason);
  });

  // === 错误 ===
  socketManager.on('error_msg', (data) => {
    ui.addLog(`⚠️ ${data.message}`);
  });

  // === 辅助函数 ===
  function updateFieldDisplays() {
    // 这是简化版本 — 在完整实现中，
    // 服务器会在每次行动后发送更新的状态
    if (gameState.myField) {
      ui.renderMyField(gameState.myField);
    }
  }

  // === 再来一局 ===
  ui.elements.playAgainBtn.addEventListener('click', () => {
    gameState.reset();
    ui.showScreen('lobby');
    ui.showQueueStatus(false);
    ui.clearLog();
  });
})();

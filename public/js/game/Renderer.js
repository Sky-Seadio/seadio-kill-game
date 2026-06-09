// js/game/Renderer.js
class Renderer {
  constructor(gameClient) {
    this.game = gameClient;

    // Cache DOM elements
    this.screens = {
      menu: document.getElementById('main-menu'),
      waiting: document.getElementById('waiting-screen'),
      game: document.getElementById('game-screen')
    };

    this.el = {
      playerHand: document.getElementById('player-hand'),
      opponentHand: document.getElementById('opponent-hand'),
      playerField: document.getElementById('player-field'),
      opponentField: document.getElementById('opponent-field'),
      playerCardCount: document.getElementById('player-card-count'),
      opponentCardCount: document.getElementById('opponent-card-count'),
      turnIndicator: document.getElementById('turn-indicator'),
      rpsArea: document.getElementById('rps-area'),
      actionArea: document.getElementById('action-area'),
      waitingRoomId: document.getElementById('waiting-room-id'),
      notification: document.getElementById('notification'),
      notificationText: document.getElementById('notification-text'),
      gameResult: document.getElementById('game-result'),
      gameResultDetail: document.getElementById('game-result-detail'),
      gameOverModal: document.getElementById('game-over-modal')
    };
  }

  // --- Screen management ---
  showScreen(name) {
    Object.values(this.screens).forEach(s => s.classList.remove('active'));
    if (this.screens[name]) {
      this.screens[name].classList.add('active');
    }
  }

  // --- Notifications ---
  showNotification(msg) {
    this.el.notificationText.textContent = msg;
    this.el.notification.classList.add('show');
    setTimeout(() => this.el.notification.classList.remove('show'), 3000);
  }

  // --- Waiting screen ---
  showWaiting(roomId) {
    this.el.waitingRoomId.textContent = `房间号: ${roomId}`;
    this.showScreen('waiting');
  }

  // --- Card rendering ---
  renderCard(card, faceDown = false) {
    if (faceDown) {
      const div = document.createElement('div');
      div.className = 'card-back';
      div.textContent = '?';
      return div;
    }

    const div = document.createElement('div');
    div.className = `card ${card.id}`;
    div.dataset.instanceId = card.instanceId;

    const name = document.createElement('div');
    name.className = 'card-name';
    name.textContent = card.name;

    const stats = document.createElement('div');
    stats.className = 'card-stats';
    if (card.category !== 'pure_skill') {
      stats.textContent = `HP:${card.health} ATK:${card.attack}`;
    }

    div.appendChild(name);
    div.appendChild(stats);

    if (card.skill) {
      const icon = document.createElement('div');
      icon.className = 'card-skill-icon';
      icon.textContent = card.category === 'pure_skill' ? '✨' : '⚡';
      div.appendChild(icon);
    }

    // Health bar for field cards (use initial health as max)
    if (card.category !== 'pure_skill' && card._maxHealth) {
      const bar = document.createElement('div');
      bar.className = 'health-bar';
      const fill = document.createElement('div');
      fill.className = 'health-fill' + (card.health <= 1 ? ' low' : '');
      fill.style.width = `${(card.health / card._maxHealth) * 100}%`;
      bar.appendChild(fill);
      div.appendChild(bar);
    }

    return div;
  }

  renderPlayerHand() {
    this.el.playerHand.innerHTML = '';
    this.game.state.hand.forEach((card, index) => {
      const cardEl = this.renderCard(card);
      if (index === this.game.state.selectedCardIndex) {
        cardEl.classList.add('selected');
      }
      if (card.category === 'pure_skill') {
        cardEl.style.opacity = '0.5';
        cardEl.style.cursor = 'not-allowed';
      }
      cardEl.addEventListener('click', () => {
        if (this.onCardClick) this.onCardClick(index);
      });
      this.el.playerHand.appendChild(cardEl);
    });
    this.el.playerCardCount.textContent = this.game.state.hand.length;
  }

  renderOpponentHand() {
    this.el.opponentHand.innerHTML = '';
    for (let i = 0; i < this.game.state.opponentHandCount; i++) {
      this.el.opponentHand.appendChild(this.renderCard(null, true));
    }
    this.el.opponentCardCount.textContent = this.game.state.opponentHandCount;
  }

  renderFieldCards() {
    // Player field
    this.el.playerField.innerHTML = '';
    if (this.game.state.fieldCard) {
      this.el.playerField.appendChild(this.renderCard(this.game.state.fieldCard));
    }

    // Opponent field
    this.el.opponentField.innerHTML = '';
    if (this.game.state.opponentFieldCard) {
      if (this.game.state.opponentFieldCard._placeholder) {
        this.el.opponentField.appendChild(this.renderCard(null, true));
      } else if (this.game.state.opponentCardRevealed) {
        this.el.opponentField.appendChild(this.renderCard(this.game.state.opponentFieldCard));
      } else {
        this.el.opponentField.appendChild(this.renderCard(null, true));
      }
    }
  }

  // --- Phase UI ---
  renderPhase() {
    const phase = this.game.state.phase;
    const isMyTurn = this.game.isMyTurn();

    // Hide all phase areas
    this.el.rpsArea.style.display = 'none';
    this.el.actionArea.style.display = 'none';

    switch (phase) {
      case 'place_card':
        this.el.turnIndicator.textContent = `第 ${this.game.state.round} 回合 - 请放置卡牌`;
        break;

      case 'rps':
        this.el.turnIndicator.textContent = '猜拳决定先后手';
        this.el.rpsArea.style.display = 'block';
        this.updateRPSSelection();
        break;

      case 'action':
        if (isMyTurn) {
          this.el.turnIndicator.textContent = '你的回合 - 选择操作';
          this.el.actionArea.style.display = 'block';
        } else {
          this.el.turnIndicator.textContent = '对手回合 - 等待中...';
        }
        break;

      default:
        this.el.turnIndicator.textContent = '';
    }
  }

  updateRPSSelection() {
    const buttons = this.el.rpsArea.querySelectorAll('.rps-btn');
    buttons.forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.choice === this.game.state.rpsChoice);
    });
  }

  // --- Full render ---
  render() {
    this.renderPlayerHand();
    this.renderOpponentHand();
    this.renderFieldCards();
    this.renderPhase();
  }

  // --- Game over ---
  showGameOver(result) {
    if (result.draw) {
      this.el.gameResult.textContent = '平局';
      this.el.gameResultDetail.textContent = '双方都没有角色牌了';
    } else if (result.winner === this.game.state.playerId) {
      this.el.gameResult.textContent = '胜利!';
      this.el.gameResultDetail.textContent = '恭喜你赢得了比赛';
    } else {
      this.el.gameResult.textContent = '失败';
      this.el.gameResultDetail.textContent = '下次再接再厉';
    }
    this.el.gameOverModal.classList.add('active');
  }

  hideGameOver() {
    this.el.gameOverModal.classList.remove('active');
  }
}

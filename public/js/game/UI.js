// js/game/UI.js
class UI {
  constructor(renderer, socketClient, gameClient) {
    this.renderer = renderer;
    this.socket = socketClient;
    this.game = gameClient;

    // Modal elements
    this.modals = {
      createRoom: document.getElementById('create-room-modal'),
      joinRoom: document.getElementById('join-room-modal'),
      roomList: document.getElementById('room-list-modal')
    };

    this.setupMenuHandlers();
    this.setupModalHandlers();
    this.setupGameHandlers();
    this.setupSocketCallbacks();
  }

  // --- Menu handlers ---
  setupMenuHandlers() {
    document.getElementById('btn-quick-match').addEventListener('click', () => {
      this.socket.quickMatch();
      this.renderer.showNotification('正在匹配...');
    });

    document.getElementById('btn-create-room').addEventListener('click', () => {
      this.modals.createRoom.classList.add('active');
    });

    document.getElementById('btn-join-room').addEventListener('click', () => {
      this.modals.joinRoom.classList.add('active');
    });

    document.getElementById('btn-room-list').addEventListener('click', () => {
      this.socket.getRoomList();
      this.modals.roomList.classList.add('active');
    });
  }

  // --- Modal handlers ---
  setupModalHandlers() {
    // Create room
    document.getElementById('btn-confirm-create').addEventListener('click', () => {
      const password = document.getElementById('room-password').value;
      this.socket.createRoom({ password: password || null });
      this.modals.createRoom.classList.remove('active');
    });

    document.getElementById('btn-cancel-create').addEventListener('click', () => {
      this.modals.createRoom.classList.remove('active');
    });

    // Join room
    document.getElementById('btn-confirm-join').addEventListener('click', () => {
      const roomId = document.getElementById('join-room-id').value.trim().toUpperCase();
      const password = document.getElementById('join-room-password').value;
      if (!roomId) {
        this.renderer.showNotification('请输入房间号');
        return;
      }
      this.socket.joinRoom({ roomId, password: password || null });
      this.modals.joinRoom.classList.remove('active');
    });

    document.getElementById('btn-cancel-join').addEventListener('click', () => {
      this.modals.joinRoom.classList.remove('active');
    });

    // Room list
    document.getElementById('btn-refresh-rooms').addEventListener('click', () => {
      this.socket.getRoomList();
    });

    document.getElementById('btn-close-room-list').addEventListener('click', () => {
      this.modals.roomList.classList.remove('active');
    });

    // Cancel waiting
    document.getElementById('btn-cancel-waiting').addEventListener('click', () => {
      this.socket.leaveRoom();
      this.game.resetForNewGame();
      this.renderer.showScreen('menu');
    });

    // Back to menu
    document.getElementById('btn-back-to-menu').addEventListener('click', () => {
      this.renderer.hideGameOver();
      this.socket.leaveRoom();
      this.game.resetForNewGame();
      this.renderer.showScreen('menu');
    });
  }

  // --- Game input handlers ---
  setupGameHandlers() {
    // Card click
    this.renderer.onCardClick = (index) => {
      if (this.game.state.phase !== 'place_card') return;

      const card = this.game.state.hand[index];
      if (!card || card.category === 'pure_skill') return;

      // Select and immediately place
      this.game.selectCard(index);
      this.socket.placeCard(card.instanceId);
    };

    // RPS buttons
    document.querySelectorAll('.rps-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.game.state.phase !== 'rps') return;
        const choice = btn.dataset.choice;
        this.game.setRPSChoice(choice);
        this.renderer.updateRPSSelection();
        this.socket.rockPaperScissors(choice);
      });
    });

    // Attack button
    document.getElementById('btn-attack').addEventListener('click', () => {
      if (!this.game.isMyTurn()) return;
      this.socket.attack();
    });

    // Use card button (for future skill usage)
    document.getElementById('btn-use-card').addEventListener('click', () => {
      if (!this.game.isMyTurn()) return;
      this.renderer.showNotification('技能系统开发中...');
    });
  }

  // --- Socket event callbacks ---
  setupSocketCallbacks() {
    // Connected
    this.socket.on('connected', (data) => {
      this.game.setPlayerId(data.id);
    });

    // Room created
    this.socket.on('room-created', (data) => {
      this.game.setRoomId(data.roomId);
      this.game.setScreen('waiting');
      this.renderer.showWaiting(data.roomId);
    });

    // Room joined
    this.socket.on('room-joined', (data) => {
      this.game.setRoomId(data.roomId);
    });

    // Match found (quick match)
    this.socket.on('match-found', (data) => {
      this.game.setRoomId(data.roomId);
    });

    // Waiting for match
    this.socket.on('waiting-for-match', () => {
      this.renderer.showNotification('等待其他玩家...');
    });

    // Room list
    this.socket.on('room-list', (rooms) => {
      this.renderRoomList(rooms);
    });

    // Player left
    this.socket.on('player-left', () => {
      this.renderer.showNotification('对手已离开');
      this.game.resetForNewGame();
      this.renderer.showScreen('menu');
    });

    // Game start
    this.socket.on('game-start', (data) => {
      this.game.setHand(data.hand);
      this.game.setScreen('game');
      this.renderer.showScreen('game');
      this.renderer.render();
    });

    // New round
    this.socket.on('new-round', (data) => {
      this.game.setRound(data.round);
      this.game.setPhase('place_card');
      this.renderer.render();
    });

    // Phase change
    this.socket.on('phase-change', (data) => {
      this.game.setPhase(data.phase);
      this.renderer.render();
    });

    // Card placed (own card)
    this.socket.on('card-placed', (data) => {
      this.game.setFieldCard(data.card);
      this.game.removeCardFromHand(data.card.instanceId);
      this.renderer.render();
    });

    // Opponent placed a card (face-down placeholder)
    this.socket.on('opponent-placed-card', () => {
      // Show a placeholder face-down card on opponent's field
      if (!this.game.state.opponentFieldCard) {
        this.game.state.opponentFieldCard = { _placeholder: true };
        this.game.state.opponentHandCount--;
        this.renderer.render();
      }
    });

    // Opponent card revealed
    this.socket.on('opponent-card', (data) => {
      this.game.setOpponentFieldCard(data.card);
      this.renderer.render();
    });

    // RPS result
    this.socket.on('rps-result', (data) => {
      if (data.draw) {
        this.renderer.showNotification('平局! 再来一次');
        this.game.setRPSChoice(null);
      } else {
        const p1 = data.player1Choice;
        const p2 = data.player2Choice;
        const choiceNames = { rock: '石头', paper: '布', scissors: '剪刀' };
        this.renderer.showNotification(`${choiceNames[p1]} vs ${choiceNames[p2]}`);
      }
    });

    // Turn winner
    this.socket.on('turn-winner', (data) => {
      this.game.setCurrentTurn(data.winnerId);
      if (data.winnerId === this.game.state.playerId) {
        this.renderer.showNotification('你赢了猜拳! 你的回合');
      } else {
        this.renderer.showNotification('对手赢了猜拳');
      }
    });

    // Attack result
    this.socket.on('attack-result', (data) => {
      if (data.blocked) {
        this.renderer.showNotification('攻击被护盾挡住了!');
      } else {
        this.renderer.showNotification(`造成 ${data.damage} 点伤害!`);
        if (data.cardDied) {
          // If I was the defender and my card died, clear my field
          if (data.defenderId === this.game.state.playerId) {
            this.game.state.fieldCard = null;
          } else {
            // I was the attacker, opponent's card died
            this.game.state.opponentFieldCard = null;
          }
        }
      }
      this.renderer.render();
    });

    // Skill used
    this.socket.on('skill-used', (data) => {
      this.renderer.showNotification(`技能使用: ${data.skill}`);
    });

    // Game over
    this.socket.on('game-over', (data) => {
      this.renderer.showGameOver(data);
    });

    // Error
    this.socket.on('error', (data) => {
      this.renderer.showNotification(data.message || '发生错误');
    });
  }

  // --- Room list rendering ---
  renderRoomList(rooms) {
    const container = document.getElementById('room-list-container');
    if (rooms.length === 0) {
      container.innerHTML = '<p class="no-rooms">暂无可用房间</p>';
      return;
    }

    container.innerHTML = '';
    rooms.forEach(room => {
      const item = document.createElement('div');
      item.className = 'room-list-item';

      const info = document.createElement('div');
      info.className = 'room-info';

      const id = document.createElement('div');
      id.className = 'room-id';
      id.textContent = room.id;

      const playersEl = document.createElement('div');
      playersEl.className = 'room-players';
      playersEl.textContent = `${room.players}/${room.maxPlayers} ${room.hasPassword ? '🔒' : ''}`;

      info.appendChild(id);
      info.appendChild(playersEl);

      const joinBtn = document.createElement('button');
      joinBtn.className = 'menu-btn room-join-btn';
      joinBtn.textContent = '加入';
      joinBtn.addEventListener('click', () => {
        this.modals.roomList.classList.remove('active');
        if (room.hasPassword) {
          document.getElementById('join-room-id').value = room.id;
          this.modals.joinRoom.classList.add('active');
        } else {
          this.socket.joinRoom({ roomId: room.id, password: null });
        }
      });

      item.appendChild(info);
      item.appendChild(joinBtn);
      container.appendChild(item);
    });
  }
}

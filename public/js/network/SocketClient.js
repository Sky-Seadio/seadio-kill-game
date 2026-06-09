// js/network/SocketClient.js
class SocketClient {
  constructor() {
    this.socket = null;
    this.handlers = {};
  }

  connect() {
    this.socket = io();

    this.socket.on('connect', () => {
      console.log('Connected:', this.socket.id);
      this.trigger('connected', { id: this.socket.id });
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected');
      this.trigger('disconnected');
    });

    // Room events
    this.socket.on('room-created', (data) => this.trigger('room-created', data));
    this.socket.on('room-joined', (data) => this.trigger('room-joined', data));
    this.socket.on('room-list', (data) => this.trigger('room-list', data));
    this.socket.on('player-left', (data) => this.trigger('player-left', data));
    this.socket.on('match-found', (data) => this.trigger('match-found', data));
    this.socket.on('waiting-for-match', () => this.trigger('waiting-for-match'));

    // Game events
    this.socket.on('game-start', (data) => this.trigger('game-start', data));
    this.socket.on('new-round', (data) => this.trigger('new-round', data));
    this.socket.on('phase-change', (data) => this.trigger('phase-change', data));
    this.socket.on('card-placed', (data) => this.trigger('card-placed', data));
    this.socket.on('opponent-card', (data) => this.trigger('opponent-card', data));
    this.socket.on('rps-result', (data) => this.trigger('rps-result', data));
    this.socket.on('turn-winner', (data) => this.trigger('turn-winner', data));
    this.socket.on('attack-result', (data) => this.trigger('attack-result', data));
    this.socket.on('skill-used', (data) => this.trigger('skill-used', data));
    this.socket.on('game-over', (data) => this.trigger('game-over', data));

    // Special skill events
    this.socket.on('hunter-skill-available', (data) => this.trigger('hunter-skill-available', data));
    this.socket.on('witch-revive-available', () => this.trigger('witch-revive-available'));

    // Error
    this.socket.on('error', (data) => this.trigger('error', data));
  }

  on(event, handler) {
    if (!this.handlers[event]) this.handlers[event] = [];
    this.handlers[event].push(handler);
  }

  off(event, handler) {
    if (!this.handlers[event]) return;
    this.handlers[event] = this.handlers[event].filter(h => h !== handler);
  }

  trigger(event, data) {
    if (this.handlers[event]) {
      this.handlers[event].forEach(h => h(data));
    }
  }

  // Emit methods
  createRoom(data) {
    this.socket.emit('create-room', data);
  }

  joinRoom(data) {
    this.socket.emit('join-room', data);
  }

  leaveRoom() {
    this.socket.emit('leave-room');
  }

  getRoomList() {
    this.socket.emit('get-room-list');
  }

  quickMatch() {
    this.socket.emit('quick-match');
  }

  placeCard(cardInstanceId) {
    this.socket.emit('place-card', { cardInstanceId });
  }

  rockPaperScissors(choice) {
    this.socket.emit('rock-paper-scissors', { choice });
  }

  attack() {
    this.socket.emit('attack');
  }

  useSkill(skill, data) {
    this.socket.emit('use-skill', { skill, ...data });
  }
}

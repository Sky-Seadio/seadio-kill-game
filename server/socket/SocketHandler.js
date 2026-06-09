// server/socket/SocketHandler.js
const GameManager = require('../game/GameManager');
const BattleSystem = require('../game/BattleSystem');
const RoomManager = require('../rooms/RoomManager');

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.gameManager = new GameManager();
    this.battleSystem = new BattleSystem(this.gameManager);
    this.roomManager = new RoomManager();
    this.playerRooms = new Map();
    this.roomGames = new Map();

    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      // Room events
      socket.on('create-room', (data) => this.handleCreateRoom(socket, data));
      socket.on('join-room', (data) => this.handleJoinRoom(socket, data));
      socket.on('leave-room', () => this.handleLeaveRoom(socket));
      socket.on('get-room-list', () => this.handleGetRoomList(socket));
      socket.on('quick-match', () => this.handleQuickMatch(socket));

      // Game events
      socket.on('place-card', (data) => this.handlePlaceCard(socket, data));
      socket.on('rock-paper-scissors', (data) => this.handleRPS(socket, data));
      socket.on('attack', () => this.handleAttack(socket));
      socket.on('use-skill', (data) => this.handleUseSkill(socket, data));

      // Disconnect
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }

  handleCreateRoom(socket, data) {
    const room = this.roomManager.createRoom(socket.id, data);
    socket.join(room.id);
    this.playerRooms.set(socket.id, room.id);

    socket.emit('room-created', { roomId: room.id });
  }

  handleJoinRoom(socket, data) {
    const result = this.roomManager.joinRoom(data.roomId, socket.id, data.password);

    if (result.success) {
      socket.join(data.roomId);
      this.playerRooms.set(socket.id, data.roomId);

      socket.emit('room-joined', { roomId: data.roomId });

      if (result.room.status === 'playing') {
        this.startGame(data.roomId);
      }
    } else {
      socket.emit('error', { message: result.error });
    }
  }

  handleLeaveRoom(socket) {
    const roomId = this.playerRooms.get(socket.id);
    if (!roomId) return;

    const result = this.roomManager.leaveRoom(roomId, socket.id);
    socket.leave(roomId);
    this.playerRooms.delete(socket.id);

    if (result.success && !result.roomDeleted) {
      this.io.to(roomId).emit('player-left', { playerId: socket.id });
    }
  }

  handleGetRoomList(socket) {
    const roomList = this.roomManager.getRoomList();
    socket.emit('room-list', roomList);
  }

  handleQuickMatch(socket) {
    this.roomManager.addToWaitingList(socket.id);

    const room = this.roomManager.findMatch(socket.id);

    if (room) {
      socket.join(room.id);
      this.playerRooms.set(socket.id, room.id);

      const otherPlayerId = room.players.find(id => id !== socket.id);
      this.io.to(otherPlayerId).emit('match-found', { roomId: room.id });
      socket.emit('match-found', { roomId: room.id });

      this.startGame(room.id);
    } else {
      socket.emit('waiting-for-match');
    }
  }

  startGame(roomId) {
    const room = this.roomManager.getRoom(roomId);
    if (!room || room.players.length !== 2) return;

    const game = this.gameManager.createGame(roomId, room.players[0], room.players[1]);
    this.roomGames.set(roomId, game);

    // Send game state to players
    room.players.forEach(playerId => {
      const player = game.players[playerId];
      this.io.to(playerId).emit('game-start', {
        hand: player.hand,
        opponentId: room.players.find(id => id !== playerId)
      });
    });

    // Start first turn
    this.startTurn(roomId);
  }

  startTurn(roomId) {
    const game = this.gameManager.getGame(roomId);
    if (!game) return;

    game.round++;
    game.turnPhase = 'place_card';

    this.io.to(roomId).emit('new-round', { round: game.round });
    this.io.to(roomId).emit('phase-change', { phase: 'place_card' });
  }

  handlePlaceCard(socket, data) {
    const roomId = this.playerRooms.get(socket.id);
    if (!roomId) return;

    const result = this.gameManager.placeCard(roomId, socket.id, data.cardInstanceId);

    if (result.success) {
      socket.emit('card-placed', { card: result.card });

      // Notify opponent that a card was placed (face-down)
      const opponentId = Object.keys(this.gameManager.getGame(roomId).players).find(id => id !== socket.id);
      if (opponentId) {
        this.io.to(opponentId).emit('opponent-placed-card');
      }

      // Check if both players placed
      const game = this.gameManager.getGame(roomId);
      const players = Object.values(game.players);

      if (players.every(p => p.fieldCard !== null)) {
        // Both placed, move to RPS phase
        game.turnPhase = 'rps';
        this.io.to(roomId).emit('phase-change', { phase: 'rps' });

        // Send opponent's card info
        players.forEach(player => {
          const opponentId = Object.keys(game.players).find(id => id !== player.id);
          this.io.to(player.id).emit('opponent-card', {
            card: game.players[opponentId].fieldCard
          });
        });
      }
    } else {
      socket.emit('error', { message: result.error });
    }
  }

  handleRPS(socket, data) {
    const roomId = this.playerRooms.get(socket.id);
    if (!roomId) return;

    const game = this.gameManager.getGame(roomId);
    if (!game || game.turnPhase !== 'rps') return;

    // Store RPS choice
    if (!game.rpsChoices) game.rpsChoices = {};
    game.rpsChoices[socket.id] = data.choice;

    // Check if both chose
    const players = Object.keys(game.players);
    if (players.every(id => game.rpsChoices[id])) {
      const result = this.battleSystem.resolveRockPaperScissors(
        game.rpsChoices[players[0]],
        game.rpsChoices[players[1]]
      );

      this.io.to(roomId).emit('rps-result', {
        player1Choice: game.rpsChoices[players[0]],
        player2Choice: game.rpsChoices[players[1]],
        winner: result.winner,
        draw: result.draw
      });

      if (result.draw) {
        // Draw, restart RPS
        game.rpsChoices = {};
      } else {
        // Set turn winner
        game.currentTurn = result.winner === 'player1' ? players[0] : players[1];
        game.turnPhase = 'action';
        game.rpsChoices = {};

        this.io.to(roomId).emit('turn-winner', { winnerId: game.currentTurn });
        this.io.to(roomId).emit('phase-change', { phase: 'action' });
      }
    }
  }

  handleAttack(socket) {
    const roomId = this.playerRooms.get(socket.id);
    if (!roomId) return;

    const game = this.gameManager.getGame(roomId);
    if (!game || game.currentTurn !== socket.id) return;

    const opponentId = Object.keys(game.players).find(id => id !== socket.id);
    const result = this.battleSystem.resolveAttack(roomId, socket.id, opponentId);

    if (result.success) {
      this.io.to(roomId).emit('attack-result', {
        attackerId: socket.id,
        defenderId: opponentId,
        damage: result.damage,
        blocked: result.blocked,
        cardDied: result.cardDied
      });

      // Check for hunter skill
      if (result.cardDied && result.deadCard.id === 'hunter') {
        this.io.to(opponentId).emit('hunter-skill-available', {
          targetId: socket.id
        });
      }

      // Check for witch revive
      if (result.cardDied && result.deadCard.id === 'witch') {
        this.io.to(opponentId).emit('witch-revive-available');
      }

      this.endTurn(roomId);
    }
  }

  handleUseSkill(socket, data) {
    const roomId = this.playerRooms.get(socket.id);
    if (!roomId) return;

    const game = this.gameManager.getGame(roomId);
    if (!game) return;

    let result;

    switch (data.skill) {
      case 'guard_shield':
        result = this.battleSystem.resolveGuardShield(
          roomId,
          socket.id,
          data.targetId,
          data.isInstant
        );
        break;
      case 'witch_poison':
        result = this.battleSystem.resolveWitchPoison(
          roomId,
          socket.id,
          data.targetId
        );
        break;
      case 'seer_vision':
        result = this.battleSystem.resolveSeerVision(
          roomId,
          socket.id,
          data.targetId,
          data.forcedCardId
        );
        break;
      case 'seer_dodge':
        // Handled in attack logic
        result = { success: true };
        break;
      case 'witch_revive':
        result = this.battleSystem.resolveWitchRevive(
          roomId,
          socket.id
        );
        break;
      default:
        result = { success: false, error: 'Unknown skill' };
    }

    if (result.success) {
      this.io.to(roomId).emit('skill-used', {
        playerId: socket.id,
        skill: data.skill,
        result
      });

      // Check win condition
      const winResult = this.gameManager.checkNoRoleCard(roomId);
      if (winResult) {
        this.io.to(roomId).emit('game-over', winResult);
        this.gameManager.removeGame(roomId);
        return;
      }

      // End turn after using a skill (except seer_dodge which is passive)
      if (data.skill !== 'seer_dodge') {
        this.endTurn(roomId);
      }
    } else {
      socket.emit('error', { message: result.error });
    }
  }

  endTurn(roomId) {
    const game = this.gameManager.getGame(roomId);
    if (!game) return;

    // Reduce shield turns
    this.gameManager.reduceShieldTurns(roomId);

    // Check win condition
    const winResult = this.gameManager.checkNoRoleCard(roomId);
    if (winResult) {
      this.io.to(roomId).emit('game-over', winResult);
      this.gameManager.removeGame(roomId);
      return;
    }

    // Start new turn
    this.startTurn(roomId);
  }

  handleDisconnect(socket) {
    console.log('User disconnected:', socket.id);

    const roomId = this.playerRooms.get(socket.id);
    if (roomId) {
      this.handleLeaveRoom(socket);
    }

    this.roomManager.removeFromWaitingList(socket.id);
  }
}

module.exports = SocketHandler;

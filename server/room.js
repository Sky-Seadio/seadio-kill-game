const { dealCards } = require('./data');

class GameRoom {
  constructor(id, player1Id, player2Id) {
    this.id = id;
    this.players = {
      [player1Id]: this.createPlayerState(player1Id),
      [player2Id]: this.createPlayerState(player2Id),
    };
    this.playerIds = [player1Id, player2Id];
    this.round = 0;
    this.phase = 'deploy'; // deploy -> reveal -> rps -> action -> resolve
    this.currentRound = {
      deployments: {},    // { playerId: cardId }
      rpsChoices: {},     // { playerId: 'rock'|'scissors'|'paper' }
      rpsWinner: null,
      action: null,
      actionResolved: false,
    };
    this.status = 'playing'; // playing | finished
    this.winner = null;

    // 发牌
    const dealt = dealCards();
    this.players[player1Id].hand = dealt.player1;
    this.players[player2Id].hand = dealt.player2;
  }

  createPlayerState(playerId) {
    return {
      id: playerId,
      hand: [],           // 手牌
      field: null,        // 场上角色（对象，包含 hp, maxHp, atk 等）
      lost: [],           // 已消耗/失去的角色牌
      shieldActive: false, // 守卫盾是否激活
      dodgeActive: false,  // 预言家躲避是否激活
      witchReviveUsed: false,
    };
  }

  getPlayer(playerId) {
    return this.players[playerId];
  }

  getOpponentId(playerId) {
    return this.playerIds.find(id => id !== playerId);
  }

  getOpponent(playerId) {
    return this.players[this.getOpponentId(playerId)];
  }

  /**
   * 从手牌部署一张牌到场上（暗置）
   */
  deployCard(playerId, cardId) {
    const player = this.getPlayer(playerId);
    const cardIndex = player.hand.findIndex(c => c.id === cardId);

    if (cardIndex === -1) return { success: false, error: '卡牌不在手中' };

    const card = player.hand[cardIndex];

    // 如果玩家场上已有存活角色，且这是角色牌，则为换角色（仅在赢得 RPS 时）
    if (player.field && card.category === 'character') {
      return { success: false, error: '场上角色仍存活，请使用换角色操作' };
    }

    player.hand.splice(cardIndex, 1);
    this.currentRound.deployments[playerId] = card;

    return { success: true, card };
  }

  /**
   * 双方都已部署，揭示卡牌
   */
  reveal() {
    this.phase = 'reveal';
    const p1Id = this.playerIds[0];
    const p2Id = this.playerIds[1];
    return {
      [p1Id]: this.currentRound.deployments[p1Id] || null,
      [p2Id]: this.currentRound.deployments[p2Id] || null,
    };
  }

  /**
   * 记录石头剪刀布选择
   */
  makeRPSChoice(playerId, choice) {
    this.currentRound.rpsChoices[playerId] = choice;

    // 检查双方是否都已选择
    const bothChosen = this.playerIds.every(id => this.currentRound.rpsChoices[id]);

    if (!bothChosen) return { ready: false };

    // 确定赢家
    const p1Choice = this.currentRound.rpsChoices[this.playerIds[0]];
    const p2Choice = this.currentRound.rpsChoices[this.playerIds[1]];
    const result = GameRoom.rpsResult(p1Choice, p2Choice);

    if (result === 'draw') {
      // 平局，重新选择
      this.currentRound.rpsChoices = {};
      return { ready: true, result: 'draw' };
    }

    this.currentRound.rpsWinner = result === 'p1' ? this.playerIds[0] : this.playerIds[1];
    return { ready: true, result, winner: this.currentRound.rpsWinner };
  }

  /**
   * 静态方法：确定石头剪刀布结果
   * 返回 'p1' | 'p2' | 'draw'
   */
  static rpsResult(choice1, choice2) {
    if (choice1 === choice2) return 'draw';
    const wins = { rock: 'scissors', scissors: 'paper', paper: 'rock' };
    return wins[choice1] === choice2 ? 'p1' : 'p2';
  }

  /**
   * 处理赢家的行动
   */
  performAction(playerId, action) {
    if (this.currentRound.rpsWinner !== playerId) {
      return { success: false, error: '不是你的回合' };
    }

    this.currentRound.action = action;
    return { success: true };
  }

  /**
   * 检查游戏是否结束（玩家没有角色牌在手牌和场上）
   */
  checkGameOver() {
    for (const playerId of this.playerIds) {
      const player = this.getPlayer(playerId);
      const hasFieldChar = player.field && player.field.currentHp > 0;
      const hasHandChars = player.hand.some(c => c.category === 'character' || c.category === 'dual');

      if (!hasFieldChar && !hasHandChars) {
        this.status = 'finished';
        this.winner = this.getOpponentId(playerId);
        return { gameOver: true, winner: this.winner, loser: playerId };
      }
    }
    return { gameOver: false };
  }
}

// 匹配队列
class Matchmaker {
  constructor() {
    this.queue = []; // 等待中的 socket id 数组
    this.rooms = new Map(); // roomId -> GameRoom
    this.playerRoomMap = new Map(); // playerId -> roomId
  }

  /**
   * 添加玩家到队列，尝试匹配
   */
  addPlayer(playerId) {
    if (this.queue.includes(playerId)) return null;
    if (this.playerRoomMap.has(playerId)) return null;

    this.queue.push(playerId);

    if (this.queue.length >= 2) {
      const p1 = this.queue.shift();
      const p2 = this.queue.shift();
      const roomId = `room_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const room = new GameRoom(roomId, p1, p2);

      this.rooms.set(roomId, room);
      this.playerRoomMap.set(p1, roomId);
      this.playerRoomMap.set(p2, roomId);

      return { room, player1: p1, player2: p2 };
    }

    return null;
  }

  /**
   * 从队列中移除玩家或处理断开连接
   */
  removePlayer(playerId) {
    // 从队列中移除
    const idx = this.queue.indexOf(playerId);
    if (idx !== -1) {
      this.queue.splice(idx, 1);
      return null;
    }

    // 查找并处理房间
    const roomId = this.playerRoomMap.get(playerId);
    if (roomId) {
      const room = this.rooms.get(roomId);
      if (room && room.status === 'playing') {
        room.status = 'finished';
        room.winner = room.getOpponentId(playerId);
      }
      this.playerRoomMap.delete(playerId);
      return { roomId, room };
    }

    return null;
  }

  getRoom(playerId) {
    const roomId = this.playerRoomMap.get(playerId);
    return roomId ? this.rooms.get(roomId) : null;
  }
}

module.exports = { GameRoom, Matchmaker };

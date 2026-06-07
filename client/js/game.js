/**
 * 客户端游戏状态管理器
 */
class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.roomId = null;
    this.myHand = [];           // 我的手牌
    this.myField = null;        // 我的场上角色
    this.lostCards = [];         // 我的已消耗/失去的牌
    this.opponentHandCount = 6;
    this.opponentField = null;  // 对手的场上角色（揭示的信息）
    this.phase = 'lobby';       // lobby | deploy | reveal | rps | action | gameover
    this.isMyTurn = false;
    this.round = 0;
    this.revealedCard = null;   // 我本轮部署的牌（用于显示）
  }

  setGameStart(data) {
    this.roomId = data.roomId;
    this.myHand = data.yourHand;
    this.opponentHandCount = data.opponentHandCount;
    this.phase = 'deploy';
  }

  addCardToField(card) {
    // 从卡牌数据创建场上角色
    const stats = CHARACTER_STATS[card.type];
    this.myField = {
      ...card,
      maxHp: stats.hp,
      currentHp: stats.hp,
      atk: stats.atk,
    };
  }

  removeFromHand(cardId) {
    this.myHand = this.myHand.filter(c => c.id !== cardId);
  }

  hasCharacterCards() {
    return this.myHand.some(c => c.category === 'character' || c.category === 'dual');
  }

  hasSkillCards() {
    return this.myHand.some(c => c.skillCard);
  }

  getDualCards() {
    return this.myHand.filter(c => c.category === 'dual');
  }

  getCharacterCards() {
    return this.myHand.filter(c => c.category === 'character' || c.category === 'dual');
  }
}

const gameState = new GameState();

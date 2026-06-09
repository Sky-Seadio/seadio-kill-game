// js/game/GameClient.js
class GameClient {
  constructor() {
    this.state = {
      screen: 'menu',       // menu | waiting | game
      roomId: null,
      playerId: null,
      hand: [],
      fieldCard: null,
      opponentFieldCard: null,
      opponentHandCount: 6,
      phase: null,           // place_card | rps | action
      round: 0,
      currentTurn: null,     // playerId of whose turn it is
      selectedCardIndex: -1,
      rpsChoice: null,
      opponentCardRevealed: false
    };
  }

  setPlayerId(id) {
    this.state.playerId = id;
  }

  setRoomId(id) {
    this.state.roomId = id;
  }

  setScreen(screen) {
    this.state.screen = screen;
  }

  setHand(hand) {
    this.state.hand = hand.map(c => ({ ...c, _maxHealth: c.health }));
    this.state.selectedCardIndex = -1;
  }

  setFieldCard(card) {
    this.state.fieldCard = card ? { ...card, _maxHealth: card._maxHealth || card.health } : null;
  }

  setOpponentFieldCard(card) {
    this.state.opponentFieldCard = card ? { ...card, _maxHealth: card._maxHealth || card.health } : null;
    this.state.opponentCardRevealed = true;
  }

  setPhase(phase) {
    this.state.phase = phase;
    this.state.rpsChoice = null;
    this.state.opponentCardRevealed = false;
    // Don't clear field cards here - they stay until killed
  }

  setRound(round) {
    this.state.round = round;
  }

  setCurrentTurn(playerId) {
    this.state.currentTurn = playerId;
  }

  selectCard(index) {
    if (this.state.phase !== 'place_card') return false;
    const card = this.state.hand[index];
    if (!card || card.category === 'pure_skill') return false;
    this.state.selectedCardIndex = index;
    return true;
  }

  deselectCard() {
    this.state.selectedCardIndex = -1;
  }

  removeCardFromHand(cardInstanceId) {
    this.state.hand = this.state.hand.filter(c => c.instanceId !== cardInstanceId);
    this.state.selectedCardIndex = -1;
  }

  setRPSChoice(choice) {
    this.state.rpsChoice = choice;
  }

  resetForNewGame() {
    this.state = {
      screen: 'menu',
      roomId: null,
      playerId: null,
      hand: [],
      fieldCard: null,
      opponentFieldCard: null,
      opponentHandCount: 6,
      phase: null,
      round: 0,
      currentTurn: null,
      selectedCardIndex: -1,
      rpsChoice: null,
      opponentCardRevealed: false
    };
  }

  isMyTurn() {
    return this.state.currentTurn === this.state.playerId;
  }
}

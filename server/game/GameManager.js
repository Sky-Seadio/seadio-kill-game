// server/game/GameManager.js
const { CardDeck, CARD_TYPES } = require('./CardDeck');

class GameManager {
  constructor() {
    this.games = new Map();
  }

  createGame(roomId, player1Id, player2Id) {
    const deck = new CardDeck();
    const player1Hand = deck.dealCards(6);
    const player2Hand = deck.dealCards(6);

    const game = {
      roomId,
      players: {
        [player1Id]: {
          id: player1Id,
          hand: player1Hand,
          fieldCard: null,
          shield: null,
          shieldTurns: 0
        },
        [player2Id]: {
          id: player2Id,
          hand: player2Hand,
          fieldCard: null,
          shield: null,
          shieldTurns: 0
        }
      },
      deck,
      currentTurn: null,
      turnPhase: 'waiting',
      round: 0,
      winner: null
    };

    this.games.set(roomId, game);
    return game;
  }

  getGame(roomId) {
    return this.games.get(roomId);
  }

  removeGame(roomId) {
    this.games.delete(roomId);
  }

  hasRoleCard(hand) {
    return hand.some(card => 
      card.category !== 'pure_skill'
    );
  }

  placeCard(roomId, playerId, cardInstanceId) {
    const game = this.games.get(roomId);
    if (!game) return { success: false, error: 'Game not found' };

    const player = game.players[playerId];
    if (!player) return { success: false, error: 'Player not found' };

    const cardIndex = player.hand.findIndex(c => c.instanceId === cardInstanceId);
    if (cardIndex === -1) return { success: false, error: 'Card not in hand' };

    const card = player.hand[cardIndex];
    if (card.category === 'pure_skill') {
      return { success: false, error: 'Cannot place pure skill card' };
    }

    player.hand.splice(cardIndex, 1);
    player.fieldCard = card;

    return { success: true, card };
  }

  checkNoRoleCard(roomId) {
    const game = this.games.get(roomId);
    if (!game) return null;

    const player1Id = Object.keys(game.players)[0];
    const player2Id = Object.keys(game.players)[1];

    const player1HasRole = this.hasRoleCard(game.players[player1Id].hand);
    const player2HasRole = this.hasRoleCard(game.players[player2Id].hand);

    if (!player1HasRole && !player2HasRole) {
      return { winner: null, draw: true };
    } else if (!player1HasRole) {
      return { winner: player2Id, draw: false };
    } else if (!player2HasRole) {
      return { winner: player1Id, draw: false };
    }

    return null;
  }

  applyDamage(roomId, targetPlayerId, damage) {
    const game = this.games.get(roomId);
    if (!game) return null;

    const targetPlayer = game.players[targetPlayerId];
    if (!targetPlayer || !targetPlayer.fieldCard) return null;

    // Check shield
    if (targetPlayer.shield && targetPlayer.shieldTurns > 0) {
      targetPlayer.shield = null;
      targetPlayer.shieldTurns = 0;
      return { blocked: true, damage: 0 };
    }

    targetPlayer.fieldCard.health -= damage;
    
    if (targetPlayer.fieldCard.health <= 0) {
      const deadCard = targetPlayer.fieldCard;
      targetPlayer.fieldCard = null;
      game.deck.discard(deadCard);
      return { blocked: false, damage, cardDied: true, deadCard };
    }

    return { blocked: false, damage, cardDied: false };
  }

  applyShield(roomId, targetPlayerId, isInstant = false) {
    const game = this.games.get(roomId);
    if (!game) return { success: false, error: 'Game not found' };

    const targetPlayer = game.players[targetPlayerId];
    if (!targetPlayer || !targetPlayer.fieldCard) {
      return { success: false, error: 'Target has no field card' };
    }

    targetPlayer.shield = true;
    targetPlayer.shieldTurns = isInstant ? 1 : 3;

    return { success: true };
  }

  reduceShieldTurns(roomId) {
    const game = this.games.get(roomId);
    if (!game) return;

    Object.values(game.players).forEach(player => {
      if (player.shield && player.shieldTurns > 0) {
        player.shieldTurns--;
        if (player.shieldTurns <= 0) {
          player.shield = null;
        }
      }
    });
  }
}

module.exports = GameManager;

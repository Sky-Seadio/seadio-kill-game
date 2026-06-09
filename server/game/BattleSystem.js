// server/game/BattleSystem.js
class BattleSystem {
  constructor(gameManager) {
    this.gameManager = gameManager;
  }

  resolveRockPaperScissors(player1Choice, player2Choice) {
    const choices = ['rock', 'paper', 'scissors'];

    if (!choices.includes(player1Choice) || !choices.includes(player2Choice)) {
      return { error: 'Invalid choice' };
    }

    if (player1Choice === player2Choice) {
      return { winner: null, draw: true };
    }

    const wins = {
      rock: 'scissors',
      paper: 'rock',
      scissors: 'paper'
    };

    if (wins[player1Choice] === player2Choice) {
      return { winner: 'player1', draw: false };
    } else {
      return { winner: 'player2', draw: false };
    }
  }

  resolveAttack(roomId, attackerId, defenderId) {
    const game = this.gameManager.getGame(roomId);
    if (!game) return { success: false, error: 'Game not found' };

    const attacker = game.players[attackerId];
    const defender = game.players[defenderId];

    if (!attacker.fieldCard) {
      return { success: false, error: 'Attacker has no field card' };
    }

    if (!defender.fieldCard) {
      return { success: false, error: 'Defender has no field card' };
    }

    const damage = attacker.fieldCard.attack;
    const result = this.gameManager.applyDamage(roomId, defenderId, damage);

    return {
      success: true,
      damage,
      ...result
    };
  }

  resolveHunterSkill(roomId, hunterPlayerId, targetPlayerId) {
    const game = this.gameManager.getGame(roomId);
    if (!game) return { success: false, error: 'Game not found' };

    const hunterPlayer = game.players[hunterPlayerId];
    if (!hunterPlayer.fieldCard || hunterPlayer.fieldCard.type !== 'hunter') {
      return { success: false, error: 'No hunter on field' };
    }

    const result = this.gameManager.applyDamage(roomId, targetPlayerId, 10);
    return { success: true, ...result };
  }

  resolveWitchPoison(roomId, witchPlayerId, targetPlayerId) {
    const game = this.gameManager.getGame(roomId);
    if (!game) return { success: false, error: 'Game not found' };

    const witchPlayer = game.players[witchPlayerId];
    if (!witchPlayer.fieldCard || witchPlayer.fieldCard.type !== 'witch') {
      return { success: false, error: 'No witch on field' };
    }

    // Poison ignores shield
    const targetPlayer = game.players[targetPlayerId];
    if (!targetPlayer.fieldCard) {
      return { success: false, error: 'Target has no field card' };
    }

    targetPlayer.fieldCard.health -= 10;

    if (targetPlayer.fieldCard.health <= 0) {
      const deadCard = targetPlayer.fieldCard;
      targetPlayer.fieldCard = null;
      game.deck.discard(deadCard);
      return { success: true, cardDied: true, deadCard };
    }

    return { success: true, cardDied: false };
  }

  resolveSeerVision(roomId, seerPlayerId, targetPlayerId, forcedCardId) {
    const game = this.gameManager.getGame(roomId);
    if (!game) return { success: false, error: 'Game not found' };

    const seerPlayer = game.players[seerPlayerId];
    const seerCardIndex = seerPlayer.hand.findIndex(c => c.type === 'seer');

    if (seerCardIndex === -1) {
      return { success: false, error: 'No seer in hand' };
    }

    const targetPlayer = game.players[targetPlayerId];
    const forcedCard = targetPlayer.hand.find(c => c.instanceId === forcedCardId);

    if (!forcedCard) {
      return { success: false, error: 'Forced card not in hand' };
    }

    // Remove seer from hand
    seerPlayer.hand.splice(seerCardIndex, 1);
    game.deck.discard({ type: 'seer' });

    return {
      success: true,
      targetHand: targetPlayer.hand.map(c => c.instanceId),
      forcedCard: forcedCard.instanceId
    };
  }

  resolveGuardShield(roomId, guardPlayerId, targetPlayerId, isInstant = false) {
    const game = this.gameManager.getGame(roomId);
    if (!game) return { success: false, error: 'Game not found' };

    const guardPlayer = game.players[guardPlayerId];

    if (isInstant) {
      // Instant shield from hand
      const guardCardIndex = guardPlayer.hand.findIndex(c => c.type === 'guard');
      if (guardCardIndex === -1) {
        return { success: false, error: 'No guard in hand' };
      }
      guardPlayer.hand.splice(guardCardIndex, 1);
      game.deck.discard({ type: 'guard' });
    } else {
      // Shield from field
      if (!guardPlayer.fieldCard || guardPlayer.fieldCard.type !== 'guard') {
        return { success: false, error: 'No guard on field' };
      }
    }

    const result = this.gameManager.applyShield(roomId, targetPlayerId, isInstant);
    return result;
  }

  resolveWitchRevive(roomId, witchPlayerId) {
    const game = this.gameManager.getGame(roomId);
    if (!game) return { success: false, error: 'Game not found' };

    const witchPlayer = game.players[witchPlayerId];
    if (!witchPlayer.fieldCard || witchPlayer.fieldCard.type !== 'witch') {
      return { success: false, error: 'No witch on field' };
    }

    witchPlayer.fieldCard.health = 2; // Full health for witch
    return { success: true };
  }
}

module.exports = BattleSystem;

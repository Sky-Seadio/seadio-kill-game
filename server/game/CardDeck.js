// server/game/CardDeck.js
const CARD_TYPES = {
  VILLAGER: 'villager',
  WEREWOLF: 'werewolf',
  HUNTER: 'hunter',
  GUARD: 'guard',
  WITCH: 'witch',
  SEER: 'seer'
};

const CARD_CATEGORIES = {
  PURE_CHARACTER: 'pure_character',
  CHARACTER_SKILL: 'character_skill',
  SKILLED_CHARACTER: 'skilled_character',
  PURE_SKILL: 'pure_skill'
};

const CARDS = {
  [CARD_TYPES.VILLAGER]: {
    id: CARD_TYPES.VILLAGER,
    name: '村民',
    category: CARD_CATEGORIES.PURE_CHARACTER,
    health: 2,
    attack: 1,
    skill: null,
    count: 4
  },
  [CARD_TYPES.WEREWOLF]: {
    id: CARD_TYPES.WEREWOLF,
    name: '狼人',
    category: CARD_CATEGORIES.PURE_CHARACTER,
    health: 3,
    attack: 1,
    skill: null,
    count: 4
  },
  [CARD_TYPES.HUNTER]: {
    id: CARD_TYPES.HUNTER,
    name: '猎人',
    category: CARD_CATEGORIES.SKILLED_CHARACTER,
    health: 3,
    attack: 1.5,
    skill: 'hunter_shot',
    count: 2
  },
  [CARD_TYPES.GUARD]: {
    id: CARD_TYPES.GUARD,
    name: '守卫',
    category: CARD_CATEGORIES.CHARACTER_SKILL,
    health: 3,
    attack: 1,
    skill: 'guard_shield',
    count: 2
  },
  [CARD_TYPES.WITCH]: {
    id: CARD_TYPES.WITCH,
    name: '女巫',
    category: CARD_CATEGORIES.SKILLED_CHARACTER,
    health: 2,
    attack: 1,
    skill: 'witch_potion',
    count: 2
  },
  [CARD_TYPES.SEER]: {
    id: CARD_TYPES.SEER,
    name: '预言家',
    category: CARD_CATEGORIES.PURE_SKILL,
    health: 0,
    attack: 0,
    skill: 'seer_vision',
    count: 2
  }
};

class CardDeck {
  constructor() {
    this.deck = [];
    this.discardPile = [];
    this.initializeDeck();
  }

  initializeDeck() {
    this.deck = [];
    Object.values(CARDS).forEach(card => {
      for (let i = 0; i < card.count; i++) {
        this.deck.push({ ...card, instanceId: `${card.id}_${i}` });
      }
    });
    this.shuffle();
  }

  shuffle() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  dealCards(count) {
    if (this.deck.length < count) {
      return null;
    }
    return this.deck.splice(0, count);
  }

  discard(card) {
    this.discardPile.push(card);
  }

  reset() {
    this.initializeDeck();
    this.discardPile = [];
  }
}

module.exports = { CardDeck, CARDS, CARD_TYPES, CARD_CATEGORIES };

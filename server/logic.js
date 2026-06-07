const { CHARACTER_STATS } = require('./data');

/**
 * 创建场上的角色实例
 */
function createFieldCharacter(card) {
  const stats = CHARACTER_STATS[card.type];
  return {
    id: card.id,
    type: card.type,
    name: stats.name,
    maxHp: stats.hp,
    currentHp: stats.hp,
    atk: stats.atk,
    skill: stats.skill,
    // 女巫专用
    reviveUsed: false,
  };
}

/**
 * 对场上角色造成伤害
 * 返回 { died, overkill, actualDamage }
 */
function applyDamage(character, damage) {
  const actualDamage = Math.min(damage, character.currentHp);
  character.currentHp -= actualDamage;
  return {
    died: character.currentHp <= 0,
    overkill: damage - actualDamage,
    actualDamage,
  };
}

/**
 * 处理普通攻击
 */
function processAttack(attackerField, defenderField, defenderState) {
  const result = {
    attacker: attackerField.type,
    defender: defenderField.type,
    damage: attackerField.atk,
    effects: [],
  };

  // 检查防御方是否有预言家躲避
  if (defenderState.dodgeActive) {
    defenderState.dodgeActive = false;
    result.effects.push({ type: 'dodge', message: `${defenderField.name} 躲避了攻击！` });
    result.damage = 0;
    return result;
  }

  // 检查防御方是否有守卫盾
  if (defenderState.shieldActive) {
    defenderState.shieldActive = false;
    result.effects.push({ type: 'shield', message: `守卫之盾抵挡了攻击！` });
    result.damage = 0;
    return result;
  }

  // 造成伤害
  const dmgResult = applyDamage(defenderField, attackerField.atk);
  result.dmgResult = dmgResult;

  if (dmgResult.died) {
    result.effects.push({
      type: 'death',
      message: `${defenderField.name} 被击败了！`,
      character: defenderField.type,
    });
  }

  return result;
}

/**
 * 处理猎人的殉职技能（死亡时）
 * 返回对对手场上角色造成的伤害
 */
function processHunterDeath(hunterField, opponentField) {
  if (hunterField.skill !== 'martyrdom') return null;

  return {
    type: 'martyrdom',
    damage: 10,
    message: `猎人发动【殉职】！对 ${opponentField.name} 造成 10 点伤害！`,
  };
}

/**
 * 处理女巫的自我复活（死亡时）
 * 返回女巫是否应该复活
 */
function processWitchDeath(witchState) {
  if (witchState.skill !== 'revive_self') return false;
  if (witchState.reviveUsed) return false;

  witchState.reviveUsed = true;
  witchState.currentHp = witchState.maxHp;
  return true;
}

/**
 * 处理女巫毒药（直接击杀，无视守卫盾，但预言家躲避可躲）
 */
function processWitchPoison(targetField, targetState) {
  // 检查预言家躲避
  if (targetState.dodgeActive) {
    targetState.dodgeActive = false;
    return {
      success: false,
      message: `预言家躲避了毒药！`,
    };
  }

  // 直接击杀（无视守卫盾）
  const previousHp = targetField.currentHp;
  targetField.currentHp = 0;

  return {
    success: true,
    message: `女巫使用毒药！${targetField.name} 被直接击杀！`,
    killedCharacter: targetField.type,
  };
}

/**
 * 处理预言家的被动躲避激活
 */
function processSeerDeploy(seerField, playerState) {
  if (seerField.skill === 'dodge') {
    playerState.dodgeActive = true;
  }
}

/**
 * 处理守卫盾技能牌使用
 */
function processShieldCard(playerState) {
  playerState.shieldActive = true;
  return {
    type: 'shield',
    message: '守护之盾已激活！可免疫下一次伤害。',
  };
}

/**
 * 处理预言家天眼技能牌使用
 * 返回对手手牌信息并强制下次部署
 */
function processRevealCard(opponentState) {
  return {
    type: 'reveal',
    hand: opponentState.hand.map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      category: c.category,
    })),
    message: '天眼发动！你看到了对方的所有手牌。',
  };
}

/**
 * 处理女巫复活队友技能牌
 * 返回可复活的已失去角色列表
 */
function processReviveAllyCard(playerState) {
  if (playerState.lost.length === 0) {
    return { success: false, message: '没有可复活的角色牌。' };
  }

  return {
    success: true,
    lost: playerState.lost.map(c => ({ id: c.id, name: c.name, type: c.type })),
    message: '选择一张已失去的角色牌复活。',
  };
}

/**
 * 执行复活：将失去的牌移回手牌
 */
function executeRevive(playerState, cardId) {
  const idx = playerState.lost.findIndex(c => c.id === cardId);
  if (idx === -1) return { success: false, error: '卡牌不在失去牌堆中' };

  const card = playerState.lost.splice(idx, 1)[0];
  playerState.hand.push(card);

  return { success: true, card, message: `${card.name} 已复活并回到手牌！` };
}

module.exports = {
  createFieldCharacter,
  applyDamage,
  processAttack,
  processHunterDeath,
  processWitchDeath,
  processWitchPoison,
  processSeerDeploy,
  processShieldCard,
  processRevealCard,
  processReviveAllyCard,
  executeRevive,
};

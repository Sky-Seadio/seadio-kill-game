const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { Matchmaker, GameRoom } = require('./room');
const logic = require('./logic');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const matchmaker = new Matchmaker();

app.use(express.static(path.join(__dirname, '../client')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', game: 'Seadio Kill' });
});

function getPlayerSocket(playerId) {
  return io.sockets.sockets.get(playerId);
}

function emitToRoom(room, event, data) {
  for (const pid of room.playerIds) {
    const s = getPlayerSocket(pid);
    if (s) s.emit(event, data);
  }
}

function emitToPlayer(playerId, event, data) {
  const s = getPlayerSocket(playerId);
  if (s) s.emit(event, data);
}

io.on('connection', (socket) => {
  console.log(`玩家已连接: ${socket.id}`);

  // === 匹配系统 ===
  socket.on('join_queue', () => {
    console.log(`${socket.id} 加入队列`);
    const match = matchmaker.addPlayer(socket.id);

    if (match) {
      const { room, player1, player2 } = match;
      const s1 = getPlayerSocket(player1);
      const s2 = getPlayerSocket(player2);
      if (s1) s1.join(room.id);
      if (s2) s2.join(room.id);

      // 发送游戏开始信息
      for (const pid of room.playerIds) {
        emitToPlayer(pid, 'game_start', {
          roomId: room.id,
          yourHand: room.players[pid].hand.map(c => ({
            id: c.id, type: c.type, category: c.category,
            name: c.name, hp: c.hp, atk: c.atk,
            skill: c.skill, skillCard: c.skillCard,
          })),
          opponentHandCount: room.getOpponent(pid).hand.length,
        });
      }

      room.round = 1;
      room.phase = 'deploy';
      emitToRoom(room, 'round_start', { round: 1, phase: 'deploy' });
    } else {
      socket.emit('queue_joined', { message: '正在等待对手...' });
    }
  });

  // === 部署阶段 ===
  socket.on('deploy_card', ({ cardId }) => {
    const room = matchmaker.getRoom(socket.id);
    if (!room || room.phase !== 'deploy') {
      socket.emit('error_msg', { message: '现在不能部署' });
      return;
    }

    const result = room.deployCard(socket.id, cardId);
    if (!result.success) {
      socket.emit('error_msg', { message: result.error });
      return;
    }

    // 通知玩家部署成功
    socket.emit('deploy_success', { cardId });

    // 检查双方是否都已部署
    const bothDeployed = room.playerIds.every(pid =>
      room.currentRound.deployments[pid]
    );

    if (bothDeployed) {
      // 揭示阶段
      room.phase = 'reveal';
      const reveals = room.reveal();

      for (const pid of room.playerIds) {
        emitToPlayer(pid, 'cards_revealed', {
          yourCard: reveals[pid],
          opponentCard: reveals[room.getOpponentId(pid)],
        });
      }

      // 进入石头剪刀布阶段
      room.phase = 'rps';
      emitToRoom(room, 'rps_start', { message: '石头剪刀布！' });
    }
  });

  // === 石头剪刀布阶段 ===
  socket.on('rps_choice', ({ choice }) => {
    const room = matchmaker.getRoom(socket.id);
    if (!room || room.phase !== 'rps') {
      socket.emit('error_msg', { message: '现在不能进行石头剪刀布' });
      return;
    }

    if (!['rock', 'scissors', 'paper'].includes(choice)) {
      socket.emit('error_msg', { message: '无效选择' });
      return;
    }

    const result = room.makeRPSChoice(socket.id, choice);

    if (!result.ready) {
      // 通知对手此玩家已准备
      emitToPlayer(room.getOpponentId(socket.id), 'opponent_rps_ready', {});
      return;
    }

    if (result.result === 'draw') {
      emitToRoom(room, 'rps_result', { result: 'draw' });
      // 重新进行石头剪刀布
      emitToRoom(room, 'rps_start', { message: '平局！再来一次！' });
      return;
    }

    // 我们有了赢家
    emitToRoom(room, 'rps_result', {
      result: 'win',
      winner: result.winner,
      loser: room.getOpponentId(result.winner),
    });

    room.phase = 'action';
    emitToPlayer(result.winner, 'your_turn', {
      actions: ['attack', 'skill', 'swap'],
      message: '你的回合！选择行动：攻击 / 出技能牌 / 换角色',
    });
    emitToPlayer(room.getOpponentId(result.winner), 'opponent_turn', {
      message: '对方回合中...',
    });
  });

  // === 行动阶段 ===
  socket.on('action', ({ type, cardId, targetId }) => {
    const room = matchmaker.getRoom(socket.id);
    if (!room || room.phase !== 'action') {
      socket.emit('error_msg', { message: '现在不能行动' });
      return;
    }

    if (room.currentRound.rpsWinner !== socket.id) {
      socket.emit('error_msg', { message: '不是你的回合' });
      return;
    }

    const player = room.getPlayer(socket.id);
    const opponent = room.getOpponent(socket.id);

    if (type === 'attack') {
      if (!player.field || player.field.currentHp <= 0) {
        socket.emit('error_msg', { message: '场上没有角色可以攻击' });
        return;
      }
      if (!opponent.field || opponent.field.currentHp <= 0) {
        socket.emit('error_msg', { message: '对手场上没有角色' });
        return;
      }

      const attackResult = logic.processAttack(player.field, opponent.field, opponent);

      // 发送攻击结果
      emitToRoom(room, 'action_result', {
        type: 'attack',
        attacker: socket.id,
        result: attackResult,
      });

      // 处理死亡
      if (attackResult.dmgResult && attackResult.dmgResult.died) {
        handleCharacterDeath(room, room.getOpponentId(socket.id), opponent);
      }

      endRound(room);

    } else if (type === 'skill') {
      // 从手中打出技能牌
      const card = player.hand.find(c => c.id === cardId);
      if (!card) {
        socket.emit('error_msg', { message: '卡牌不在手中' });
        return;
      }

      let skillResult;

      if (card.skillCard === 'shield') {
        // 守卫盾 - 保护自己
        skillResult = logic.processShieldCard(player);
        player.hand = player.hand.filter(c => c.id !== cardId);
        emitToRoom(room, 'action_result', { type: 'skill', playerId: socket.id, result: skillResult });

      } else if (card.skillCard === 'reveal') {
        // 预言家天眼 - 查看对手手牌
        skillResult = logic.processRevealCard(opponent);
        player.hand = player.hand.filter(c => c.id !== cardId);
        emitToPlayer(socket.id, 'action_result', { type: 'skill', playerId: socket.id, result: skillResult });

      } else if (card.skillCard === 'revive_ally') {
        // 女巫复活 - 需要选择目标
        skillResult = logic.processReviveAllyCard(player);
        if (!skillResult.success) {
          socket.emit('error_msg', { message: skillResult.message });
          return;
        }
        // 发送失去的牌列表供选择
        socket.emit('select_revive_target', {
          lost: skillResult.lost,
          cardId: cardId, // 正在使用的女巫牌
        });
        return; // 等待目标选择
      } else {
        socket.emit('error_msg', { message: '此卡牌不能作为技能使用' });
        return;
      }

      endRound(room);

    } else if (type === 'swap') {
      // 换场上角色
      const newCard = player.hand.find(c => c.id === cardId && (c.category === 'character' || c.category === 'dual'));
      if (!newCard) {
        socket.emit('error_msg', { message: '卡牌不在手中或不是角色牌' });
        return;
      }

      // 将旧场上角色移回手牌（如果存在）
      if (player.field) {
        // 旧卡被消耗（进入失去牌堆），新卡上场
        player.lost.push({ ...player.field, id: player.field.id, type: player.field.type, name: player.field.name, category: 'character', hp: player.field.maxHp, atk: player.field.atk });
      }

      player.hand = player.hand.filter(c => c.id !== cardId);
      player.field = logic.createFieldCharacter(newCard);

      // 如果新角色是预言家，激活躲避
      logic.processSeerDeploy(player.field, player);

      emitToRoom(room, 'action_result', {
        type: 'swap',
        playerId: socket.id,
        newCharacter: { type: player.field.type, name: player.field.name, hp: player.field.currentHp, maxHp: player.field.maxHp },
      });

      endRound(room);
    }
  });

  // === 复活目标选择 ===
  socket.on('select_revive_target', ({ cardId, targetCardId }) => {
    const room = matchmaker.getRoom(socket.id);
    if (!room || room.phase !== 'action') {
      socket.emit('error_msg', { message: '现在不能选择目标' });
      return;
    }

    const player = room.getPlayer(socket.id);

    // 从手中移除女巫技能牌
    player.hand = player.hand.filter(c => c.id !== cardId);

    // 执行复活
    const result = logic.executeRevive(player, targetCardId);
    if (result.success) {
      emitToRoom(room, 'action_result', {
        type: 'skill',
        playerId: socket.id,
        result: { type: 'revive', message: result.message, card: { name: result.card.name, type: result.card.type } },
      });
    }

    endRound(room);
  });

  // === 断开连接 ===
  socket.on('disconnect', () => {
    console.log(`玩家已断开: ${socket.id}`);
    const result = matchmaker.removePlayer(socket.id);
    if (result && result.room) {
      emitToPlayer(result.room.getOpponentId(socket.id), 'game_over', {
        winner: result.room.getOpponentId(socket.id),
        reason: 'opponent_disconnected',
      });
    }
  });
});

/**
 * 处理角色死亡 — 触发死亡技能，移入失去牌堆
 */
function handleCharacterDeath(room, playerId, playerState) {
  const deadChar = playerState.field;

  // 猎人殉职
  if (deadChar.skill === 'martyrdom') {
    const opponent = room.getOpponent(playerId);
    if (opponent.field && opponent.field.currentHp > 0) {
      // 检查守卫盾
      if (opponent.shieldActive) {
        opponent.shieldActive = false;
        emitToRoom(room, 'death_skill', {
          playerId,
          skill: 'martyrdom',
          message: '猎人发动【殉职】，但被守卫之盾抵挡！',
        });
      } else {
        const martyrdomDmg = logic.applyDamage(opponent.field, 10);
        emitToRoom(room, 'death_skill', {
          playerId,
          skill: 'martyrdom',
          damage: 10,
          targetHp: opponent.field.currentHp,
          message: `猎人发动【殉职】！对 ${opponent.field.name} 造成 10 点伤害！`,
        });
        if (martyrdomDmg.died) {
          handleCharacterDeath(room, room.getOpponentId(playerId), opponent);
        }
      }
    }
  }

  // 女巫自我复活
  if (deadChar.skill === 'revive_self' && !deadChar.reviveUsed) {
    deadChar.reviveUsed = true;
    deadChar.currentHp = deadChar.maxHp;
    emitToRoom(room, 'death_skill', {
      playerId,
      skill: 'revive_self',
      message: `女巫发动【复活】！满血复活！`,
      hp: deadChar.currentHp,
    });
    return; // 不移入失去牌堆
  }

  // 移入失去牌堆
  playerState.lost.push({ ...deadChar, category: 'character', hp: deadChar.maxHp, atk: deadChar.atk });
  playerState.field = null;

  // 清除增益
  playerState.dodgeActive = false;
  playerState.shieldActive = false;
}

/**
 * 结束当前回合，检查游戏结束，开始下一回合
 */
function endRound(room) {
  // 检查游戏结束
  const gameOver = room.checkGameOver();
  if (gameOver.gameOver) {
    emitToRoom(room, 'game_over', {
      winner: gameOver.winner,
      loser: gameOver.loser,
      reason: 'all_characters_lost',
    });
    return;
  }

  // 重置回合状态
  room.currentRound = {
    deployments: {},
    rpsChoices: {},
    rpsWinner: null,
    action: null,
    actionResolved: false,
  };
  room.round++;
  room.phase = 'deploy';

  emitToRoom(room, 'round_start', { round: room.round, phase: 'deploy' });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Seadio Kill 服务器运行在 http://localhost:${PORT}`);
});

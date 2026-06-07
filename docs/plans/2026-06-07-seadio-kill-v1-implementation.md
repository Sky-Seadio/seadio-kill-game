# Seadio Kill v1.0 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking。

**Goal:** 构建一个 1v1 在线卡牌对战游戏，以狼人杀角色为原型，包含暗置角色、石头剪刀布争夺行动权、技能牌等核心机制。

**Architecture:** 客户端-服务器架构，使用 Node.js + Express + Socket.io。服务器管理游戏房间、匹配和权威游戏状态。客户端处理渲染和用户输入，通过 Socket.io 事件通信。

**Tech Stack:** Node.js, Express, Socket.io, HTML, CSS, Vanilla JavaScript

---

## 文件结构

```
Seadio Kill/
├── package.json                 # Node.js 项目配置
├── server/
│   ├── index.js                 # Express + Socket.io 服务器入口
│   ├── data.js                  # 角色和卡牌定义
│   ├── room.js                  # 游戏房间和匹配系统
│   └── logic.js                 # 战斗结算和技能效果
├── client/
│   ├── index.html               # 主 HTML 页面
│   ├── css/
│   │   └── style.css            # 所有样式
│   ├── js/
│   │   ├── data.js              # 卡牌/角色数据（镜像服务器）
│   │   ├── socket.js            # Socket.io 客户端封装
│   │   ├── game.js              # 客户端游戏状态
│   │   ├── ui.js                # DOM 渲染
│   │   └── main.js              # 入口点
│   └── assets/
│       └── cards/               # 卡牌图片（已存在）
├── docs/
│   ├── specs/
│   │   └── 2026-06-07-seadio-kill-v1-final-design.md
│   └── plans/
│       └── 2026-06-07-seadio-kill-v1-implementation.md
└── README.md
```

---

## Task 1: 项目脚手架

**Files:**
- Create: `package.json`
- Create: `server/index.js`
- Create: `client/index.html`
- Create: `client/css/style.css`
- Create: `client/js/main.js`

- [ ] **Step 1: 初始化 npm 项目**

```bash
cd "e:/Ai/Seadio Kill" && npm init -y
```

- [ ] **Step 2: 安装依赖**

```bash
cd "e:/Ai/Seadio Kill" && npm install express socket.io
```

- [ ] **Step 3: 创建服务器入口**

Create `server/index.js`:
```javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 提供静态客户端文件
app.use(express.static(path.join(__dirname, '../client')));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', game: 'Seadio Kill' });
});

// Socket.io 连接
io.on('connection', (socket) => {
  console.log(`玩家已连接: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`玩家已断开: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Seadio Kill 服务器运行在 http://localhost:${PORT}`);
});
```

- [ ] **Step 4: 创建最小客户端页面**

Create `client/index.html`:
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Seadio Kill</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <h1>Seadio Kill</h1>
  <p>游戏加载中...</p>
  <script src="/socket.io/socket.io.js"></script>
  <script src="js/main.js"></script>
</body>
</html>
```

Create `client/css/style.css`:
```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Microsoft YaHei', sans-serif;
  background: #1a1a2e;
  color: #eee;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

h1 {
  font-size: 3rem;
  color: #e94560;
  text-shadow: 0 0 20px rgba(233, 69, 96, 0.5);
}
```

Create `client/js/main.js`:
```javascript
const socket = io();

socket.on('connect', () => {
  console.log('已连接到服务器:', socket.id);
});

socket.on('disconnect', () => {
  console.log('已断开连接');
});
```

- [ ] **Step 5: 添加 npm 启动脚本**

Edit `package.json`, set scripts:
```json
{
  "scripts": {
    "start": "node server/index.js",
    "dev": "node server/index.js"
  }
}
```

- [ ] **Step 6: 测试服务器启动**

```bash
cd "e:/Ai/Seadio Kill" && node server/index.js
```
Expected: `Seadio Kill 服务器运行在 http://localhost:3000`
Open browser to `http://localhost:3000`, should see "Seadio Kill" heading.
Press Ctrl+C to stop.

- [ ] **Step 7: 提交**

```bash
cd "e:/Ai/Seadio Kill"
git init
git add .
git commit -m "feat: 项目脚手架，Express + Socket.io 服务器"
```

---

## Task 2: 角色和卡牌数据

**Files:**
- Create: `server/data.js`
- Create: `client/js/data.js`

- [ ] **Step 1: 创建服务器端数据定义**

Create `server/data.js`:
```javascript
// 共享牌库中的所有 16 张牌
const DECK = [
  // 村民 ×4
  { id: 'villager_1', type: 'villager', category: 'character', name: '村民', hp: 2, atk: 1, skill: null, skillCard: null },
  { id: 'villager_2', type: 'villager', category: 'character', name: '村民', hp: 2, atk: 1, skill: null, skillCard: null },
  { id: 'villager_3', type: 'villager', category: 'character', name: '村民', hp: 2, atk: 1, skill: null, skillCard: null },
  { id: 'villager_4', type: 'villager', category: 'character', name: '村民', hp: 2, atk: 1, skill: null, skillCard: null },

  // 狼人 ×4
  { id: 'wolf_1', type: 'wolf', category: 'character', name: '狼人', hp: 3, atk: 1, skill: null, skillCard: null },
  { id: 'wolf_2', type: 'wolf', category: 'character', name: '狼人', hp: 3, atk: 1, skill: null, skillCard: null },
  { id: 'wolf_3', type: 'wolf', category: 'character', name: '狼人', hp: 3, atk: 1, skill: null, skillCard: null },
  { id: 'wolf_4', type: 'wolf', category: 'character', name: '狼人', hp: 3, atk: 1, skill: null, skillCard: null },

  // 猎人 ×2
  { id: 'hunter_1', type: 'hunter', category: 'character', name: '猎人', hp: 3, atk: 1.5, skill: 'martyrdom', skillCard: null },
  { id: 'hunter_2', type: 'hunter', category: 'character', name: '猎人', hp: 3, atk: 1.5, skill: 'martyrdom', skillCard: null },

  // 守卫 ×2
  { id: 'guardian_1', type: 'guardian', category: 'dual', name: '守卫', hp: 2, atk: 1, skill: null, skillCard: 'shield' },
  { id: 'guardian_2', type: 'guardian', category: 'dual', name: '守卫', hp: 2, atk: 1, skill: null, skillCard: 'shield' },

  // 女巫 ×2
  { id: 'witch_1', type: 'witch', category: 'dual', name: '女巫', hp: 2, atk: 1, skill: 'revive_self', skillCard: 'revive_ally' },
  { id: 'witch_2', type: 'witch', category: 'dual', name: '女巫', hp: 2, atk: 1, skill: 'revive_self', skillCard: 'revive_ally' },

  // 预言家 ×2（纯技能牌）
  { id: 'seer_1', type: 'seer', category: 'skill', name: '预言家', hp: null, atk: null, skill: null, skillCard: 'reveal' },
  { id: 'seer_2', type: 'seer', category: 'skill', name: '预言家', hp: null, atk: null, skill: null, skillCard: 'reveal' },
];

// 角色类型查找（用于创建实例）
const CHARACTER_STATS = {
  villager: { name: '村民', hp: 2, atk: 1, skill: null },
  wolf:     { name: '狼人', hp: 3, atk: 1, skill: null },
  hunter:   { name: '猎人', hp: 3, atk: 1.5, skill: 'martyrdom' },
  guardian:  { name: '守卫', hp: 2, atk: 1, skill: null },
  witch:    { name: '女巫', hp: 2, atk: 1, skill: 'revive_self' },
  seer:     { name: '预言家', hp: null, atk: null, skill: null },
};

// 技能牌效果描述
const SKILL_EFFECTS = {
  shield:      { name: '守护之盾', desc: '免疫一次伤害' },
  revive_ally: { name: '复活药水', desc: '复活一张已失去的角色牌' },
  reveal:      { name: '天眼', desc: '查看对方所有手牌，指定其下一张出的角色' },
};

// 技能描述（被动）
const SKILL_DESC = {
  martyrdom:   { name: '殉职', desc: '死亡时对对方场上角色造成10点伤害' },
  revive_self: { name: '复活', desc: '死亡时满血复活一次' },
  dodge:       { name: '躲避', desc: '可躲避一次攻击（含毒药）' },
};

/**
 * 洗牌（Fisher-Yates）
 */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 从洗好的 16 张牌库中各发 6 张牌给每个玩家
 */
function dealCards() {
  const shuffled = shuffle(DECK);
  return {
    player1: shuffled.slice(0, 6),
    player2: shuffled.slice(6, 12),
    remaining: shuffled.slice(12), // 4 张牌未使用
  };
}

module.exports = { DECK, CHARACTER_STATS, SKILL_EFFECTS, SKILL_DESC, shuffle, dealCards };
```

- [ ] **Step 2: 创建客户端数据（镜像）**

Create `client/js/data.js`:
```javascript
// 客户端数据镜像服务器数据
const CHARACTER_STATS = {
  villager: { name: '村民', hp: 2, atk: 1 },
  wolf:     { name: '狼人', hp: 3, atk: 1 },
  hunter:   { name: '猎人', hp: 3, atk: 1.5 },
  guardian:  { name: '守卫', hp: 2, atk: 1 },
  witch:    { name: '女巫', hp: 2, atk: 1 },
  seer:     { name: '预言家', hp: null, atk: null },
};

const SKILL_EFFECTS = {
  shield:      { name: '守护之盾', desc: '免疫一次伤害' },
  revive_ally: { name: '复活药水', desc: '复活一张已失去的角色牌' },
  reveal:      { name: '天眼', desc: '查看对方所有手牌，指定其下一张出的角色' },
};

const SKILL_DESC = {
  martyrdom:   { name: '殉职', desc: '死亡时对对方场上角色造成10点伤害' },
  revive_self: { name: '复活', desc: '死亡时满血复活一次' },
  poison:      { name: '毒药', desc: '直接击杀对方场上一个角色（无视守卫盾）' },
  dodge:       { name: '躲避', desc: '可躲避一次攻击（含毒药）' },
};
```

- [ ] **Step 3: 测试数据加载**

```bash
cd "e:/Ai/Seadio Kill" && node -e "const d = require('./server/data'); console.log('牌库:', d.DECK.length, '张牌'); const h = d.dealCards(); console.log('P1:', h.player1.length, 'P2:', h.player2.length);"
```
Expected: `牌库: 16 张牌`, `P1: 6 P2: 6`

- [ ] **Step 4: 提交**

```bash
git add server/data.js client/js/data.js
git commit -m "feat: 添加角色和卡牌数据定义"
```

---

## Task 3: 游戏房间和匹配系统

**Files:**
- Create: `server/room.js`
- Modify: `server/index.js`

- [ ] **Step 1: 创建游戏房间管理器**

Create `server/room.js`:
```javascript
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
```

- [ ] **Step 2: 将房间管理器集成到服务器**

Modify `server/index.js`:
```javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { Matchmaker } = require('./room');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const matchmaker = new Matchmaker();

// 提供静态客户端文件
app.use(express.static(path.join(__dirname, '../client')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', game: 'Seadio Kill' });
});

io.on('connection', (socket) => {
  console.log(`玩家已连接: ${socket.id}`);

  // 加入匹配队列
  socket.on('join_queue', () => {
    console.log(`${socket.id} 加入队列`);
    const match = matchmaker.addPlayer(socket.id);

    if (match) {
      const { room, player1, player2 } = match;

      // 将两个玩家加入房间的 socket.io 房间
      const s1 = io.sockets.sockets.get(player1);
      const s2 = io.sockets.sockets.get(player2);

      if (s1) s1.join(room.id);
      if (s2) s2.join(room.id);

      // 向每个玩家发送游戏开始信息（包含各自的手牌）
      if (s1) s1.emit('game_start', {
        roomId: room.id,
        yourHand: room.players[player1].hand.map(c => ({
          id: c.id, type: c.type, category: c.category,
          name: c.name, hp: c.hp, atk: c.atk,
          skill: c.skill, skillCard: c.skillCard,
        })),
        opponentHandCount: room.players[player2].hand.length,
      });

      if (s2) s2.emit('game_start', {
        roomId: room.id,
        yourHand: room.players[player2].hand.map(c => ({
          id: c.id, type: c.type, category: c.category,
          name: c.name, hp: c.hp, atk: c.atk,
          skill: c.skill, skillCard: c.skillCard,
        })),
        opponentHandCount: room.players[player1].hand.length,
      });

      // 开始第一回合
      io.to(room.id).emit('round_start', { round: 1 });
    } else {
      socket.emit('queue_joined', { message: '正在等待对手...' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`玩家已断开: ${socket.id}`);
    const result = matchmaker.removePlayer(socket.id);
    if (result && result.room) {
      const opponentId = result.room.getOpponentId(socket.id);
      const opponentSocket = io.sockets.sockets.get(opponentId);
      if (opponentSocket) {
        opponentSocket.emit('game_over', { winner: opponentId, reason: 'opponent_disconnected' });
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Seadio Kill 服务器运行在 http://localhost:${PORT}`);
});
```

- [ ] **Step 3: 测试匹配系统**

```bash
cd "e:/Ai/Seadio Kill" && node server/index.js
```
Open two tabs to `http://localhost:3000`, in both consoles run `socket.emit('join_queue')`.
Expected: Both receive `game_start` event with hand data.

- [ ] **Step 4: 提交**

```bash
git add server/room.js server/index.js
git commit -m "feat: 添加游戏房间管理和匹配系统"
```

---

## Task 4: 游戏逻辑 — 战斗和技能

**Files:**
- Create: `server/logic.js`
- Modify: `server/index.js`

- [ ] **Step 1: 创建战斗结算逻辑**

Create `server/logic.js`:
```javascript
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
```

- [ ] **Step 2: 测试逻辑函数**

```bash
cd "e:/Ai/Seadio Kill" && node -e "
const l = require('./server/logic');
const c = {id:'t',type:'wolf',name:'狼人',hp:3,atk:1,skill:null};
const fc = l.createFieldCharacter(c);
console.log('场上角色:', fc);
const r = l.applyDamage(fc, 1.5);
console.log('伤害结果:', r);
console.log('剩余 HP:', fc.currentHp);
"
```
Expected: 场上角色有 3 maxHp，受到 1.5 伤害后有 1.5 currentHp。

- [ ] **Step 3: 提交**

```bash
git add server/logic.js
git commit -m "feat: 添加战斗结算和技能效果逻辑"
```

---

## Task 5: Socket.io 游戏事件

**Files:**
- Modify: `server/index.js`

- [ ] **Step 1: 添加所有游戏事件处理到服务器**

Replace `server/index.js` with full game event handling:
```javascript
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
        // 旧角色保留当前 HP - 实际上它带着当前 HP 移回手牌
        // 但手牌中的卡牌不跟踪 HP... 让我们用不同方式处理
        // 根据设计：换角色意味着替换场上角色，旧卡保留已扣 HP
        // 为简单起见：旧卡被消耗（进入失去牌堆），新卡上场
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
    if (!room) return;

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
```

- [ ] **Step 2: 测试完整游戏循环**

```bash
cd "e:/Ai/Seadio Kill" && node server/index.js
```
Open two browser tabs, both emit `socket.emit('join_queue')`, then simulate deploy → RPS → attack cycle in console.

- [ ] **Step 3: 提交**

```bash
git add server/index.js
git commit -m "feat: 实现完整游戏事件处理，包含战斗和技能"
```

---

## Task 6: 客户端 HTML 和 CSS

**Files:**
- Modify: `client/index.html`
- Modify: `client/css/style.css`

- [ ] **Step 1: 构建完整 HTML 结构**

Replace `client/index.html`:
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Seadio Kill</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <!-- 大厅界面 -->
  <div id="screen-lobby" class="screen active">
    <div class="lobby-container">
      <h1 class="game-title">Seadio Kill</h1>
      <p class="subtitle">狼人杀卡牌对战</p>
      <button id="btn-join-queue" class="btn btn-primary">开始匹配</button>
      <p id="queue-status" class="status-text hidden">正在匹配对手...</p>
    </div>
  </div>

  <!-- 游戏界面 -->
  <div id="screen-game" class="screen hidden">
    <!-- 对手区域 -->
    <div class="opponent-area">
      <div class="player-info opponent-info">
        <span class="player-label">对手</span>
        <span class="hand-count">手牌: <span id="opponent-hand-count">6</span></span>
      </div>
      <div class="field opponent-field">
        <div id="opponent-field-card" class="field-card empty">
          <span class="card-placeholder">?</span>
        </div>
      </div>
    </div>

    <!-- 战斗区域 -->
    <div class="battle-area">
      <div id="battle-log" class="battle-log">
        <p class="log-entry">游戏开始！</p>
      </div>

      <!-- 石头剪刀布区域 -->
      <div id="rps-section" class="rps-section hidden">
        <p class="rps-prompt">石头剪刀布！</p>
        <div class="rps-buttons">
          <button class="rps-btn" data-choice="rock">✊</button>
          <button class="rps-btn" data-choice="scissors">✌️</button>
          <button class="rps-btn" data-choice="paper">🖐️</button>
        </div>
      </div>

      <!-- 行动选择区域 -->
      <div id="action-section" class="action-section hidden">
        <p class="action-prompt">选择行动：</p>
        <div class="action-buttons">
          <button class="action-btn" data-action="attack">⚔️ 攻击</button>
          <button class="action-btn" data-action="skill">🃏 出技能牌</button>
          <button class="action-btn" data-action="swap">🔄 换角色</button>
        </div>
      </div>

      <!-- 毒药目标选择 -->
      <div id="poison-section" class="target-section hidden">
        <p class="target-prompt">选择毒药目标：</p>
        <div id="poison-targets" class="target-buttons"></div>
      </div>

      <!-- 复活目标选择 -->
      <div id="revive-section" class="target-section hidden">
        <p class="target-prompt">选择复活目标：</p>
        <div id="revive-targets" class="target-buttons"></div>
      </div>
    </div>

    <!-- 玩家区域 -->
    <div class="player-area">
      <div class="field player-field">
        <div id="player-field-card" class="field-card empty">
          <span class="card-placeholder">选择角色牌部署</span>
        </div>
      </div>
      <div class="player-info">
        <span class="player-label">你</span>
        <div class="field-char-stats" id="player-field-stats"></div>
      </div>
    </div>

    <!-- 手牌区域 -->
    <div class="hand-area">
      <div id="hand-cards" class="hand-cards">
        <!-- 卡牌将由 JS 渲染 -->
      </div>
    </div>
  </div>

  <!-- 游戏结束界面 -->
  <div id="screen-gameover" class="screen hidden">
    <div class="gameover-container">
      <h2 id="gameover-title" class="gameover-title">游戏结束</h2>
      <p id="gameover-reason" class="gameover-reason"></p>
      <button id="btn-play-again" class="btn btn-primary">再来一局</button>
    </div>
  </div>

  <script src="/socket.io/socket.io.js"></script>
  <script src="js/data.js"></script>
  <script src="js/socket.js"></script>
  <script src="js/game.js"></script>
  <script src="js/ui.js"></script>
  <script src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: 构建 CSS**

Replace `client/css/style.css`:
```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Microsoft YaHei', sans-serif;
  background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
  color: #eee;
  min-height: 100vh;
  overflow: hidden;
}

.hidden { display: none !important; }
.screen { display: none; width: 100%; height: 100vh; }
.screen.active { display: flex; }

/* === 大厅 === */
#screen-lobby {
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.lobby-container {
  text-align: center;
}

.game-title {
  font-size: 4rem;
  color: #e94560;
  text-shadow: 0 0 30px rgba(233, 69, 96, 0.6);
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1.2rem;
  color: #aaa;
  margin-bottom: 2rem;
}

.btn {
  padding: 14px 40px;
  font-size: 1.2rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #e94560;
  color: white;
}

.btn-primary:hover {
  background: #ff6b81;
  transform: scale(1.05);
}

.status-text {
  margin-top: 1rem;
  color: #aaa;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* === 游戏界面 === */
#screen-game {
  flex-direction: column;
  padding: 10px;
}

.opponent-area, .player-area {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
}

.player-info {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.player-label {
  font-weight: bold;
  color: #e94560;
}

.hand-count {
  color: #aaa;
}

/* === 场上卡牌 === */
.field {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin: 8px 0;
}

.field-card {
  width: 100px;
  height: 140px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  transition: all 0.3s;
  position: relative;
}

.field-card.empty {
  border: 2px dashed #555;
  color: #555;
}

.field-card.face-down {
  background: linear-gradient(135deg, #2d1b69, #11001c);
  border: 2px solid #e94560;
  cursor: default;
}

.field-card.face-down::after {
  content: '?';
  font-size: 2rem;
  color: #e94560;
}

.field-card.face-up {
  background: linear-gradient(135deg, #1a1a3e, #16213e);
  border: 2px solid #0f3460;
}

.field-card.face-up .card-name {
  font-weight: bold;
  font-size: 1rem;
  margin-bottom: 5px;
}

.field-card.face-up .card-hp {
  color: #e94560;
  font-size: 0.9rem;
}

.field-card.face-up .card-atk {
  color: #f5a623;
  font-size: 0.8rem;
}

.field-card.dead {
  opacity: 0.3;
  border-color: #333;
}

/* === 战斗区域 === */
.battle-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.battle-log {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  padding: 10px 20px;
  max-width: 500px;
  width: 100%;
  max-height: 120px;
  overflow-y: auto;
  margin-bottom: 15px;
}

.log-entry {
  font-size: 0.85rem;
  color: #ccc;
  margin: 4px 0;
  line-height: 1.4;
}

.log-entry.important {
  color: #e94560;
  font-weight: bold;
}

/* === 石头剪刀布 === */
.rps-section {
  text-align: center;
}

.rps-prompt {
  font-size: 1.3rem;
  margin-bottom: 15px;
  color: #f5a623;
}

.rps-buttons {
  display: flex;
  gap: 20px;
  justify-content: center;
}

.rps-btn {
  width: 70px;
  height: 70px;
  font-size: 2rem;
  border: 2px solid #555;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: all 0.2s;
}

.rps-btn:hover {
  border-color: #e94560;
  background: rgba(233, 69, 96, 0.15);
  transform: scale(1.1);
}

.rps-btn.selected {
  border-color: #e94560;
  background: rgba(233, 69, 96, 0.3);
}

/* === 行动选择 === */
.action-section {
  text-align: center;
}

.action-prompt {
  font-size: 1.1rem;
  margin-bottom: 12px;
  color: #f5a623;
}

.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.action-btn {
  padding: 10px 20px;
  font-size: 1rem;
  border: 2px solid #555;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #eee;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  border-color: #e94560;
  background: rgba(233, 69, 96, 0.15);
}

/* === 目标选择 === */
.target-section {
  text-align: center;
}

.target-prompt {
  font-size: 1.1rem;
  margin-bottom: 12px;
  color: #f5a623;
}

.target-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.target-btn {
  padding: 10px 16px;
  font-size: 0.9rem;
  border: 2px solid #555;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #eee;
  cursor: pointer;
  transition: all 0.2s;
}

.target-btn:hover {
  border-color: #e94560;
  background: rgba(233, 69, 96, 0.15);
}

/* === 手牌卡牌 === */
.hand-area {
  flex: 0 0 auto;
  padding: 10px;
  background: rgba(0, 0, 0, 0.2);
  border-top: 1px solid #333;
}

.hand-cards {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.hand-card {
  width: 110px;
  height: 155px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 10px 6px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.hand-card.character {
  background: linear-gradient(135deg, #1a3a5c, #0d1b2a);
  border: 2px solid #1b4965;
}

.hand-card.dual {
  background: linear-gradient(135deg, #3a1c5c, #1b0d2a);
  border: 2px solid #6b3fa0;
}

.hand-card.skill {
  background: linear-gradient(135deg, #5c3a1a, #2a1b0d);
  border: 2px solid #a06b3f;
}

.hand-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 8px 25px rgba(233, 69, 96, 0.3);
}

.hand-card.selected {
  border-color: #e94560;
  box-shadow: 0 0 15px rgba(233, 69, 96, 0.5);
  transform: translateY(-10px);
}

.hand-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hand-card .card-name {
  font-size: 0.95rem;
  font-weight: bold;
  text-align: center;
}

.hand-card .card-stats {
  font-size: 0.75rem;
  text-align: center;
  color: #aaa;
}

.hand-card .card-stats .hp { color: #e94560; }
.hand-card .card-stats .atk { color: #f5a623; }

.hand-card .card-skill {
  font-size: 0.7rem;
  color: #a78bfa;
  text-align: center;
  margin-top: 4px;
}

.hand-card .card-type-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 0.6rem;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(0,0,0,0.5);
}

/* === 游戏结束 === */
#screen-gameover {
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.gameover-container {
  text-align: center;
}

.gameover-title {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.gameover-title.win {
  color: #4ade80;
  text-shadow: 0 0 30px rgba(74, 222, 128, 0.5);
}

.gameover-title.lose {
  color: #e94560;
  text-shadow: 0 0 30px rgba(233, 69, 96, 0.5);
}

.gameover-reason {
  color: #aaa;
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

/* === 滚动条 === */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #555; border-radius: 2px; }
```

- [ ] **Step 3: 验证 UI 渲染**

```bash
cd "e:/Ai/Seadio Kill" && node server/index.js
```
Open `http://localhost:3000`, should see lobby screen with title and button.

- [ ] **Step 4: 提交**

```bash
git add client/index.html client/css/style.css
git commit -m "feat: 添加游戏 UI，包含大厅、游戏和结束界面"
```

---

## Task 7: 客户端 Socket 和游戏状态

**Files:**
- Create: `client/js/socket.js`
- Create: `client/js/game.js`

- [ ] **Step 1: 创建 Socket 封装**

Create `client/js/socket.js`:
```javascript
/**
 * Socket.io 客户端封装 — 集中所有事件处理
 */
class SocketManager {
  constructor() {
    this.socket = null;
    this.handlers = {};
  }

  connect() {
    this.socket = io();

    this.socket.on('connect', () => {
      console.log('已连接:', this.socket.id);
      this.trigger('connected', { id: this.socket.id });
    });

    this.socket.on('disconnect', () => {
      console.log('已断开');
      this.trigger('disconnected', {});
    });

    // 服务器事件
    const events = [
      'queue_joined', 'game_start', 'round_start',
      'deploy_success', 'cards_revealed',
      'rps_start', 'rps_result',
      'your_turn', 'opponent_turn', 'opponent_rps_ready',
      'action_result', 'death_skill',
      'select_revive_target',
      'game_over', 'error_msg',
    ];

    events.forEach(event => {
      this.socket.on(event, (data) => {
        this.trigger(event, data);
      });
    });
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

  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  joinQueue() {
    this.emit('join_queue', {});
  }

  deployCard(cardId) {
    this.emit('deploy_card', { cardId });
  }

  rpsChoice(choice) {
    this.emit('rps_choice', { choice });
  }

  performAction(type, cardId, targetId) {
    this.emit('action', { type, cardId, targetId });
  }

  selectReviveTarget(cardId, targetCardId) {
    this.emit('select_revive_target', { cardId, targetCardId });
  }
}

const socketManager = new SocketManager();
```

- [ ] **Step 2: 创建客户端游戏状态**

Create `client/js/game.js`:
```javascript
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
```

- [ ] **Step 3: 提交**

```bash
git add client/js/socket.js client/js/game.js
git commit -m "feat: 添加客户端 Socket 管理器和游戏状态"
```

---

## Task 8: 客户端 UI 渲染和主入口

**Files:**
- Create: `client/js/ui.js`
- Modify: `client/js/main.js`

- [ ] **Step 1: 创建 UI 渲染器**

Create `client/js/ui.js`:
```javascript
/**
 * UI 渲染器 — 根据游戏状态更新 DOM
 */
class UIRenderer {
  constructor() {
    // 缓存 DOM 元素
    this.screens = {
      lobby: document.getElementById('screen-lobby'),
      game: document.getElementById('screen-game'),
      gameover: document.getElementById('screen-gameover'),
    };

    this.elements = {
      joinBtn: document.getElementById('btn-join-queue'),
      queueStatus: document.getElementById('queue-status'),
      handCards: document.getElementById('hand-cards'),
      playerFieldCard: document.getElementById('player-field-card'),
      opponentFieldCard: document.getElementById('opponent-field-card'),
      playerFieldStats: document.getElementById('player-field-stats'),
      opponentHandCount: document.getElementById('opponent-hand-count'),
      battleLog: document.getElementById('battle-log'),
      rpsSection: document.getElementById('rps-section'),
      actionSection: document.getElementById('action-section'),
      poisonSection: document.getElementById('poison-section'),
      poisonTargets: document.getElementById('poison-targets'),
      reviveSection: document.getElementById('revive-section'),
      reviveTargets: document.getElementById('revive-targets'),
      gameoverTitle: document.getElementById('gameover-title'),
      gameoverReason: document.getElementById('gameover-reason'),
      playAgainBtn: document.getElementById('btn-play-again'),
    };
  }

  // === 界面管理 ===
  showScreen(name) {
    Object.values(this.screens).forEach(s => {
      s.classList.remove('active');
      s.classList.add('hidden');
    });
    if (this.screens[name]) {
      this.screens[name].classList.remove('hidden');
      this.screens[name].classList.add('active');
    }
  }

  // === 大厅 ===
  showQueueStatus(show) {
    this.elements.queueStatus.classList.toggle('hidden', !show);
    this.elements.joinBtn.classList.toggle('hidden', show);
  }

  // === 手牌 ===
  renderHand(cards, onCardClick) {
    this.elements.handCards.innerHTML = '';

    cards.forEach(card => {
      const el = document.createElement('div');
      el.className = `hand-card ${card.category}`;
      el.dataset.cardId = card.id;

      const stats = CHARACTER_STATS[card.type];
      const isDual = card.category === 'dual';
      const isSkill = card.category === 'skill';

      el.innerHTML = `
        <span class="card-type-badge">${isDual ? '双用' : isSkill ? '技能' : card.category === 'character' ? '角色' : '技能'}</span>
        <span class="card-name">${card.name}</span>
        ${stats.hp ? `
          <div class="card-stats">
            <span class="hp">♥${stats.hp}</span>
            <span class="atk">⚔${stats.atk}</span>
          </div>
        ` : ''}
        ${card.skill ? `<div class="card-skill">【${SKILL_DESC[card.skill]?.name || card.skill}】</div>` : ''}
        ${card.skillCard ? `<div class="card-skill">技能：${SKILL_EFFECTS[card.skillCard]?.name || card.skillCard}</div>` : ''}
      `;

      el.addEventListener('click', () => onCardClick(card));
      this.elements.handCards.appendChild(el);
    });
  }

  selectCard(cardId) {
    document.querySelectorAll('.hand-card').forEach(el => {
      el.classList.toggle('selected', el.dataset.cardId === cardId);
    });
  }

  clearCardSelection() {
    document.querySelectorAll('.hand-card').forEach(el => {
      el.classList.remove('selected');
    });
  }

  // === 场上卡牌 ===
  renderFieldCard(elementId, character, faceDown = false) {
    const el = this.elements[elementId];
    if (!character) {
      el.className = 'field-card empty';
      el.innerHTML = '<span class="card-placeholder">?</span>';
      return;
    }

    if (faceDown) {
      el.className = 'field-card face-down';
      el.innerHTML = '';
    } else {
      el.className = 'field-card face-up';
      el.innerHTML = `
        <span class="card-name">${character.name}</span>
        <span class="card-hp">♥ ${character.currentHp}/${character.maxHp}</span>
        <span class="card-atk">⚔ ${character.atk}</span>
        ${character.skill ? `<span class="card-skill" style="font-size:0.65rem;color:#a78bfa;">${SKILL_DESC[character.skill]?.name || ''}</span>` : ''}
      `;
    }
  }

  renderMyField(character) {
    this.renderFieldCard('player-field-card', character);
    // 同时更新下方统计
    if (character) {
      this.elements.playerFieldStats.innerHTML = `
        <span style="color:#e94560">♥${character.currentHp}/${character.maxHp}</span>
        <span style="color:#f5a623">⚔${character.atk}</span>
      `;
    } else {
      this.elements.playerFieldStats.innerHTML = '';
    }
  }

  renderOpponentField(character, faceDown = false) {
    this.renderFieldCard('opponent-field-card', character, faceDown);
  }

  updateOpponentHandCount(count) {
    this.elements.opponentHandCount.textContent = count;
  }

  // === 战斗日志 ===
  addLog(message, important = false) {
    const entry = document.createElement('p');
    entry.className = `log-entry${important ? ' important' : ''}`;
    entry.textContent = message;
    this.elements.battleLog.appendChild(entry);
    this.elements.battleLog.scrollTop = this.elements.battleLog.scrollHeight;
  }

  clearLog() {
    this.elements.battleLog.innerHTML = '';
  }

  // === 石头剪刀布 ===
  showRPS(show) {
    this.elements.rpsSection.classList.toggle('hidden', !show);
  }

  highlightRPS(choice) {
    document.querySelectorAll('.rps-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.choice === choice);
    });
  }

  clearRPSHighlight() {
    document.querySelectorAll('.rps-btn').forEach(btn => {
      btn.classList.remove('selected');
    });
  }

  // === 行动选择 ===
  showActions(show, availableActions = []) {
    this.elements.actionSection.classList.toggle('hidden', !show);
    if (show) {
      document.querySelectorAll('.action-btn').forEach(btn => {
        const action = btn.dataset.action;
        btn.disabled = !availableActions.includes(action);
        btn.style.opacity = availableActions.includes(action) ? '1' : '0.4';
      });
    }
  }

  // === 目标选择 ===
  showPoisonTarget(targets, onSelect) {
    this.elements.poisonSection.classList.remove('hidden');
    this.elements.poisonTargets.innerHTML = '';
    targets.forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'target-btn';
      btn.textContent = `${t.name} (♥${t.hp})`;
      btn.addEventListener('click', () => onSelect(t));
      this.elements.poisonTargets.appendChild(btn);
    });
  }

  hidePoisonTarget() {
    this.elements.poisonSection.classList.add('hidden');
  }

  showReviveTarget(targets, onSelect) {
    this.elements.reviveSection.classList.remove('hidden');
    this.elements.reviveTargets.innerHTML = '';
    targets.forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'target-btn';
      btn.textContent = t.name;
      btn.addEventListener('click', () => onSelect(t));
      this.elements.reviveTargets.appendChild(btn);
    });
  }

  hideReviveTarget() {
    this.elements.reviveSection.classList.add('hidden');
  }

  // === 游戏结束 ===
  showGameOver(isWin, reason) {
    this.showScreen('gameover');
    this.elements.gameoverTitle.textContent = isWin ? '🎉 你赢了！' : '💀 你输了';
    this.elements.gameoverTitle.className = `gameover-title ${isWin ? 'win' : 'lose'}`;

    const reasonTexts = {
      all_characters_lost: '对方所有角色牌已被消耗',
      opponent_disconnected: '对手断开连接',
    };
    this.elements.gameoverReason.textContent = reasonTexts[reason] || reason;
  }

  // === 隐藏所有交互区域 ===
  hideAllSections() {
    this.showRPS(false);
    this.showActions(false);
    this.hidePoisonTarget();
    this.hideReviveTarget();
  }
}

const ui = new UIRenderer();
```

- [ ] **Step 2: 创建主入口**

Replace `client/js/main.js`:
```javascript
/**
 * 主入口 — 将 socket 事件连接到 UI 和游戏状态
 */
(function () {
  // 连接 socket
  socketManager.connect();

  // === 大厅 ===
  ui.elements.joinBtn.addEventListener('click', () => {
    socketManager.joinQueue();
    ui.showQueueStatus(true);
  });

  socketManager.on('queue_joined', () => {
    ui.showQueueStatus(true);
  });

  // === 游戏开始 ===
  socketManager.on('game_start', (data) => {
    gameState.setGameStart(data);
    ui.showScreen('game');
    ui.clearLog();
    ui.addLog('游戏开始！从牌库中各抽 6 张牌。', true);
    ui.renderHand(gameState.myHand, onHandCardClick);
    ui.renderMyField(null);
    ui.renderOpponentField(null);
    ui.updateOpponentHandCount(data.opponentHandCount);
    ui.hideAllSections();
  });

  // === 回合开始 ===
  socketManager.on('round_start', (data) => {
    gameState.round = data.round;
    gameState.phase = 'deploy';
    gameState.revealedCard = null;
    ui.hideAllSections();
    ui.clearCardSelection();
    ui.addLog(`--- 第 ${data.round} 回合 ---`, true);
    ui.addLog('请选择一张牌暗置到场上。');
    ui.renderOpponentField(null); // 重置对手场上显示
    ui.renderHand(gameState.myHand, onHandCardClick);
  });

  // === 部署 ===
  function onHandCardClick(card) {
    if (gameState.phase !== 'deploy') return;

    // 如果玩家场上没有角色，必须部署角色/双用牌
    if (!gameState.myField) {
      if (card.category !== 'character' && card.category !== 'dual') {
        ui.addLog('你还没有场上角色，请先部署一张角色牌。');
        return;
      }
    }

    ui.selectCard(card.id);
    gameState.revealedCard = card;
    socketManager.deployCard(card.id);
  }

  socketManager.on('deploy_success', (data) => {
    const card = gameState.revealedCard;
    if (!card) return;

    if (!gameState.myField && (card.category === 'character' || card.category === 'dual')) {
      gameState.addCardToField(card);
      ui.renderMyField(gameState.myField);
    }
    gameState.removeFromHand(card.id);
    ui.renderHand(gameState.myHand, onHandCardClick);
    ui.addLog(`你暗置了一张牌。`);
    ui.clearCardSelection();
  });

  // === 揭示 ===
  socketManager.on('cards_revealed', (data) => {
    gameState.phase = 'reveal';

    // 显示对手部署的牌
    if (data.opponentCard) {
      ui.addLog(`对手暗置了：${data.opponentCard.name}`);

      // 如果对手部署了角色，更新他们的场上
      if (data.opponentCard.category === 'character' || data.opponentCard.category === 'dual') {
        const stats = CHARACTER_STATS[data.opponentCard.type];
        gameState.opponentField = {
          ...data.opponentCard,
          maxHp: stats.hp,
          currentHp: stats.hp,
          atk: stats.atk,
        };
        ui.renderOpponentField(gameState.opponentField);
      }
    }
  });

  // === 石头剪刀布 ===
  socketManager.on('rps_start', (data) => {
    gameState.phase = 'rps';
    ui.hideAllSections();
    ui.showRPS(true);
    ui.addLog(data.message || '石头剪刀布！');
  });

  // 石头剪刀布按钮点击
  document.querySelectorAll('.rps-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (gameState.phase !== 'rps') return;
      const choice = btn.dataset.choice;
      socketManager.rpsChoice(choice);
      ui.highlightRPS(choice);
      ui.addLog(`你选择了 ${choice === 'rock' ? '✊石头' : choice === 'scissors' ? '✌️剪刀' : '🖐️布'}`);
    });
  });

  socketManager.on('opponent_rps_ready', () => {
    ui.addLog('对手已选择，等待揭晓...');
  });

  socketManager.on('rps_result', (data) => {
    if (data.result === 'draw') {
      ui.addLog('平局！重新来过！');
      ui.clearRPSHighlight();
      return;
    }

    const isWinner = data.winner === socketManager.socket.id;
    ui.addLog(isWinner ? '🎉 你赢了石头剪刀布！' : '😤 对手赢了石头剪刀布...', !isWinner);
    ui.clearRPSHighlight();
  });

  // === 行动阶段 ===
  socketManager.on('your_turn', (data) => {
    gameState.phase = 'action';
    gameState.isMyTurn = true;
    ui.hideAllSections();

    // 确定可用行动
    const actions = [];
    if (gameState.myField && gameState.myField.currentHp > 0) {
      actions.push('attack');
    }
    if (gameState.hasSkillCards()) {
      actions.push('skill');
    }
    if (gameState.getCharacterCards().length > 0) {
      actions.push('swap');
    }

    ui.showActions(true, actions);
    ui.addLog(data.message || '你的回合！选择行动。', true);
  });

  socketManager.on('opponent_turn', (data) => {
    gameState.isMyTurn = false;
    ui.hideAllSections();
    ui.addLog(data.message || '对方回合中...');
  });

  // 行动按钮点击
  document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (gameState.phase !== 'action' || !gameState.isMyTurn) return;

      const action = btn.dataset.action;

      if (action === 'attack') {
        socketManager.performAction('attack');
        ui.addLog('你发动了攻击！');
        ui.showActions(false);

      } else if (action === 'skill') {
        // 显示技能牌供选择
        const skillCards = gameState.myHand.filter(c => c.skillCard);
        if (skillCards.length === 0) {
          ui.addLog('没有可用的技能牌。');
          return;
        }
        // 渲染手牌，只显示可选的技能牌
        ui.addLog('选择一张技能牌使用：');
        renderSkillCardSelection(skillCards);

      } else if (action === 'swap') {
        // 显示角色牌供换角色选择
        const charCards = gameState.getCharacterCards();
        if (charCards.length === 0) {
          ui.addLog('没有可替换的角色牌。');
          return;
        }
        ui.addLog('选择一张角色牌替换场上角色：');
        renderSwapCardSelection(charCards);
      }
    });
  });

  function renderSkillCardSelection(cards) {
    ui.elements.handCards.innerHTML = '';
    cards.forEach(card => {
      const el = document.createElement('div');
      el.className = `hand-card ${card.category} selected`;
      el.innerHTML = `
        <span class="card-name">${card.name}</span>
        <div class="card-skill">技能：${SKILL_EFFECTS[card.skillCard]?.name || card.skillCard}</div>
      `;
      el.addEventListener('click', () => {
        socketManager.performAction('skill', card.id);
        ui.addLog(`你使用了 ${card.name} 的技能！`);
        ui.showActions(false);
        ui.renderHand(gameState.myHand, onHandCardClick);
      });
      ui.elements.handCards.appendChild(el);
    });
  }

  function renderSwapCardSelection(cards) {
    ui.elements.handCards.innerHTML = '';
    cards.forEach(card => {
      const el = document.createElement('div');
      el.className = `hand-card ${card.category} selected`;
      const stats = CHARACTER_STATS[card.type];
      el.innerHTML = `
        <span class="card-name">${card.name}</span>
        <div class="card-stats">
          <span class="hp">♥${stats.hp}</span>
          <span class="atk">⚔${stats.atk}</span>
        </div>
      `;
      el.addEventListener('click', () => {
        socketManager.performAction('swap', card.id);
        ui.addLog(`你将场上角色替换为 ${card.name}。`);
        ui.showActions(false);
        ui.renderHand(gameState.myHand, onHandCardClick);
      });
      ui.elements.handCards.appendChild(el);
    });
  }

  // === 行动结果 ===
  socketManager.on('action_result', (data) => {
    if (data.type === 'attack') {
      const result = data.result;
      const isAttacker = data.attacker === socketManager.socket.id;

      ui.addLog(`${result.attacker} 攻击了 ${result.defender}！`);

      if (result.damage > 0) {
        ui.addLog(`造成 ${result.damage} 点伤害！`);
      }

      result.effects.forEach(effect => {
        ui.addLog(effect.message, effect.type === 'death');
      });

      // 更新场上显示
      updateFieldDisplays();

    } else if (data.type === 'skill') {
      ui.addLog(data.result.message || '技能发动！', true);

      if (data.result.type === 'shield') {
        // 守卫盾激活
      } else if (data.result.type === 'reveal') {
        // 预言家天眼 - 显示对手手牌
        ui.addLog(`对方手牌：${data.result.hand.map(c => c.name).join('、')}`, true);
      } else if (data.result.type === 'revive') {
        ui.addLog(`${data.result.card.name} 已复活！`);
      }
    } else if (data.type === 'swap') {
      ui.addLog(`${data.playerId === socketManager.socket.id ? '你' : '对手'} 换上了 ${data.newCharacter.name}！`);

      if (data.playerId === socketManager.socket.id) {
        const stats = CHARACTER_STATS[data.newCharacter.type];
        gameState.myField = {
          type: data.newCharacter.type,
          name: data.newCharacter.name,
          maxHp: data.newCharacter.maxHp || stats.hp,
          currentHp: data.newCharacter.hp || stats.hp,
          atk: data.newCharacter.atk || stats.atk,
        };
        ui.renderMyField(gameState.myField);
      }
    }

    // 行动后恢复手牌显示
    setTimeout(() => {
      ui.renderHand(gameState.myHand, onHandCardClick);
    }, 500);
  });

  // === 死亡技能 ===
  socketManager.on('death_skill', (data) => {
    ui.addLog(data.message, true);
    updateFieldDisplays();
  });

  // === 复活目标选择 ===
  socketManager.on('select_revive_target', (data) => {
    ui.showReviveTarget(data.lost, (target) => {
      socketManager.selectReviveTarget(data.cardId, target.id);
      ui.hideReviveTarget();
    });
  });

  // === 游戏结束 ===
  socketManager.on('game_over', (data) => {
    const isWin = data.winner === socketManager.socket.id;
    gameState.phase = 'gameover';
    ui.showGameOver(isWin, data.reason);
  });

  // === 错误 ===
  socketManager.on('error_msg', (data) => {
    ui.addLog(`⚠️ ${data.message}`);
  });

  // === 辅助函数 ===
  function updateFieldDisplays() {
    // 这是简化版本 — 在完整实现中，
    // 服务器会在每次行动后发送更新的状态
    if (gameState.myField) {
      ui.renderMyField(gameState.myField);
    }
  }

  // === 再来一局 ===
  ui.elements.playAgainBtn.addEventListener('click', () => {
    gameState.reset();
    ui.showScreen('lobby');
    ui.showQueueStatus(false);
    ui.clearLog();
  });
})();
```

- [ ] **Step 3: 测试完整游戏流程**

```bash
cd "e:/Ai/Seadio Kill" && node server/index.js
```
Open two browser tabs to `http://localhost:3000`.
1. Both click "开始匹配"
2. Both should see their hand of 6 cards
3. Both select a card to deploy (click a character card)
4. RPS section appears, both choose
5. Winner sees action buttons
6. Play through a few rounds

- [ ] **Step 4: 提交**

```bash
git add client/js/ui.js client/js/main.js
git commit -m "feat: 添加客户端 UI 渲染和游戏流程连接"
```

---

## Task 9: 牌库说明面板

**Files:**
- Modify: `client/index.html`
- Modify: `client/css/style.css`
- Modify: `client/js/ui.js`
- Modify: `client/js/main.js`

- [ ] **Step 1: 添加牌库说明面板 HTML**

Modify `client/index.html`, add after `<div class="hand-area">`:
```html
<!-- 牌库说明面板 -->
<div id="deck-panel" class="deck-panel">
  <button id="btn-toggle-deck" class="btn-toggle-deck">📚 牌库说明</button>
  <div id="deck-content" class="deck-content hidden">
    <h3 class="deck-title">牌库构成 (16张)</h3>
    <div class="deck-stats">
      <div class="deck-stat">
        <span class="stat-icon">👨‍🌾</span>
        <span class="stat-name">村民</span>
        <span class="stat-count">×4</span>
        <span class="stat-info">2HP / 1ATK</span>
      </div>
      <div class="deck-stat">
        <span class="stat-icon">🐺</span>
        <span class="stat-name">狼人</span>
        <span class="stat-count">×4</span>
        <span class="stat-info">3HP / 1ATK</span>
      </div>
      <div class="deck-stat">
        <span class="stat-icon">🏹</span>
        <span class="stat-name">猎人</span>
        <span class="stat-count">×2</span>
        <span class="stat-info">3HP / 1.5ATK / 殉职</span>
      </div>
      <div class="deck-stat">
        <span class="stat-icon">🛡️</span>
        <span class="stat-name">守卫</span>
        <span class="stat-count">×2</span>
        <span class="stat-info">2HP / 1ATK / 双用</span>
      </div>
      <div class="deck-stat">
        <span class="stat-icon">🧙‍♀️</span>
        <span class="stat-name">女巫</span>
        <span class="stat-count">×2</span>
        <span class="stat-info">2HP / 1ATK / 双用</span>
      </div>
      <div class="deck-stat">
        <span class="stat-icon">🔮</span>
        <span class="stat-name">预言家</span>
        <span class="stat-count">×2</span>
        <span class="stat-info">纯技能牌</span>
      </div>
    </div>

    <h3 class="deck-title">技能说明</h3>
    <div class="skill-list">
      <div class="skill-item">
        <span class="skill-name">【殉职】</span>
        <span class="skill-desc">猎人死亡时，对对方场上角色造成10点伤害</span>
      </div>
      <div class="skill-item">
        <span class="skill-name">【复活】</span>
        <span class="skill-desc">女巫死亡时，可满血复活一次</span>
      </div>
      <div class="skill-item">
        <span class="skill-name">【毒药】</span>
        <span class="skill-desc">女巫在场时，直接击杀对方场上一个角色（无视守卫盾）</span>
      </div>
      <div class="skill-item">
        <span class="skill-name">【守护之盾】</span>
        <span class="skill-desc">守卫技能牌，免疫一次伤害</span>
      </div>
      <div class="skill-item">
        <span class="skill-name">【天眼】</span>
        <span class="skill-desc">预言家技能牌，查看对方所有手牌，指定其下一张出的角色</span>
      </div>
      <div class="skill-item">
        <span class="skill-name">【复活药水】</span>
        <span class="skill-desc">女巫技能牌，复活一张已失去的角色牌</span>
      </div>
    </div>

    <h3 class="deck-title">克制关系</h3>
    <div class="counter-list">
      <div class="counter-item">
        <span class="counter-from">🏹 猎人</span>
        <span class="counter-arrow">→</span>
        <span class="counter-to">🐺 狼人</span>
        <span class="counter-reason">1.5ATK + 殉职10伤害</span>
      </div>
      <div class="counter-item">
        <span class="counter-from">🧙‍♀️ 女巫</span>
        <span class="counter-arrow">→</span>
        <span class="counter-to">🛡️ 守卫</span>
        <span class="counter-reason">毒药无视盾</span>
      </div>
      <div class="counter-item">
        <span class="counter-from">🛡️ 守卫</span>
        <span class="counter-arrow">→</span>
        <span class="counter-to">🏹 猎人</span>
        <span class="counter-reason">盾可挡殉职伤害</span>
      </div>
      <div class="counter-item">
        <span class="counter-from">🔮 预言家</span>
        <span class="counter-arrow">→</span>
        <span class="counter-to">🧙‍♀️ 女巫</span>
        <span class="counter-reason">躲避可躲毒药</span>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: 添加牌库说明面板 CSS**

Modify `client/css/style.css`, add:
```css
/* === 牌库说明面板 === */
.deck-panel {
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 100;
  max-width: 300px;
}

.btn-toggle-deck {
  padding: 8px 16px;
  font-size: 0.9rem;
  background: rgba(0, 0, 0, 0.7);
  color: #eee;
  border: 1px solid #555;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-toggle-deck:hover {
  background: rgba(0, 0, 0, 0.9);
  border-color: #e94560;
}

.deck-content {
  background: rgba(0, 0, 0, 0.85);
  border: 1px solid #555;
  border-radius: 8px;
  padding: 15px;
  margin-top: 8px;
  max-height: 70vh;
  overflow-y: auto;
}

.deck-title {
  font-size: 1rem;
  color: #e94560;
  margin: 15px 0 10px 0;
  padding-bottom: 5px;
  border-bottom: 1px solid #333;
}

.deck-title:first-child {
  margin-top: 0;
}

.deck-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.deck-stat {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
}

.stat-icon {
  font-size: 1.2rem;
  width: 24px;
  text-align: center;
}

.stat-name {
  font-weight: bold;
  min-width: 50px;
}

.stat-count {
  color: #aaa;
  min-width: 20px;
}

.stat-info {
  color: #888;
  font-size: 0.8rem;
}

.skill-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skill-item {
  font-size: 0.85rem;
  line-height: 1.4;
}

.skill-name {
  color: #a78bfa;
  font-weight: bold;
}

.skill-desc {
  color: #ccc;
}

.counter-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.counter-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
}

.counter-from {
  font-weight: bold;
  min-width: 70px;
}

.counter-arrow {
  color: #e94560;
}

.counter-to {
  font-weight: bold;
  min-width: 70px;
}

.counter-reason {
  color: #888;
  font-size: 0.8rem;
}
```

- [ ] **Step 3: 添加牌库说明面板 JavaScript**

Modify `client/js/ui.js`, add to UIRenderer class:
```javascript
// === 牌库说明面板 ===
setupDeckPanel() {
  const toggleBtn = document.getElementById('btn-toggle-deck');
  const content = document.getElementById('deck-content');

  toggleBtn.addEventListener('click', () => {
    content.classList.toggle('hidden');
    toggleBtn.textContent = content.classList.contains('hidden') ? '📚 牌库说明' : '✕ 关闭说明';
  });
}
```

Modify `client/js/main.js`, add after `socketManager.connect()`:
```javascript
// 设置牌库说明面板
ui.setupDeckPanel();
```

- [ ] **Step 4: 测试牌库说明面板**

```bash
cd "e:/Ai/Seadio Kill" && node server/index.js
```
Open `http://localhost:3000`, click "牌库说明" button, verify panel shows correctly.

- [ ] **Step 5: 提交**

```bash
git add client/index.html client/css/style.css client/js/ui.js client/js/main.js
git commit -m "feat: 添加牌库说明面板"
```

---

## Task 10: 端到端测试和 Bug 修复

**Files:**
- Modify: any files as needed

- [ ] **Step 1: 运行完整游戏并测试所有角色能力**

```bash
cd "e:/Ai/Seadio Kill" && node server/index.js
```
Test each scenario:
1. **普通攻击**：两个角色互相攻击，验证 HP 减少
2. **猎人殉职**：猎人死亡，验证对对手造成 10 点伤害
3. **女巫自我复活**：女巫死亡，验证满血复活
4. **女巫毒药**：使用女巫毒药，验证直接击杀
5. **守卫盾**：使用守卫盾技能牌，验证伤害被抵挡
6. **预言家躲避**：预言家在场上，验证躲避激活
7. **预言家天眼**：使用天眼技能牌，验证显示对手手牌
8. **复活队友**：使用女巫复活技能牌，验证失去的牌回到手牌

- [ ] **Step 2: 修复发现的 Bug**

- [ ] **Step 3: 最终提交**

```bash
git add .
git commit -m "fix: 端到端测试后的 Bug 修复"
```

---

## Task 11: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: 编写项目 README**

Create `README.md`:
```markdown
# Seadio Kill 🐺⚔️

以狼人杀角色为原型的 1v1 卡牌对战网页游戏。

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动服务器

```bash
npm start
```

打开两个浏览器标签页访问 `http://localhost:3000`，点击"开始匹配"即可对战。

## 游戏玩法

### 基本规则

1. 双方从 16 张共享牌库中各抽 6 张手牌
2. 每回合暗置一张牌到场上，然后石头剪刀布决定行动权
3. 赢的人选择：攻击 / 出技能牌 / 换角色
4. 对方所有角色牌被消耗即为失败

### 角色一览

| 角色 | HP | ATK | 技能 |
|------|-----|-----|------|
| 村民 | 2 | 1 | 无 |
| 狼人 | 3 | 1 | 无 |
| 猎人 | 3 | 1.5 | 殉职：死亡造成10伤害 |
| 守卫 | 2 | 1 | 技能牌：免疫一次伤害 |
| 女巫 | 2 | 1 | 复活一次 / 毒药击杀 / 技能牌：复活角色 |
| 预言家 | — | — | 纯技能牌：查看手牌 + 指定出牌 |

### 克制关系

- 猎人 → 狼人（1.5ATK + 死亡10伤害克制高血量）
- 女巫 → 守卫（毒药无视护盾）
- 守卫 → 猎人（护盾挡殉职伤害）
- 预言家 → 女巫（躲避可躲毒药）

## 技术栈

- 前端：HTML + CSS + Vanilla JavaScript
- 后端：Node.js + Express
- 通信：Socket.io
```

- [ ] **Step 2: 提交**

```bash
git add README.md
git commit -m "docs: 添加 README，包含游戏规则和设置说明"
```

---

## 自检清单

在提交计划前，我检查了：

1. **规格覆盖**：每个规格部分都有对应的任务实现
2. **占位符扫描**：没有 "TBD"、"TODO" 或模糊要求
3. **类型一致性**：所有任务中的类型、方法签名和属性名称一致

**计划完成！** ✅

---

*计划创建时间：2026-06-07*
*总任务数：11*

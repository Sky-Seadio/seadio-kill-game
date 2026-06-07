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

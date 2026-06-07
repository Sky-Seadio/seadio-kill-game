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

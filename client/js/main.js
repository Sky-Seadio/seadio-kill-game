const socket = io();

socket.on('connect', () => {
  console.log('已连接到服务器:', socket.id);
});

socket.on('disconnect', () => {
  console.log('已断开连接');
});

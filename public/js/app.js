// js/app.js
(function () {
  const socketClient = new SocketClient();
  const gameClient = new GameClient();
  const renderer = new Renderer(gameClient);
  const ui = new UI(renderer, socketClient, gameClient);

  socketClient.connect();
})();

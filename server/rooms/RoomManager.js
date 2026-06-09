class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.waitingPlayers = [];
  }

  createRoom(hostId, options = {}) {
    const roomId = this.generateRoomId();
    const room = {
      id: roomId,
      host: hostId,
      players: [hostId],
      password: options.password || null,
      maxPlayers: 2,
      status: 'waiting',
      createdAt: Date.now()
    };

    this.rooms.set(roomId, room);
    return room;
  }

  joinRoom(roomId, playerId, password = null) {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.players.length >= room.maxPlayers) {
      return { success: false, error: 'Room is full' };
    }

    if (room.password && room.password !== password) {
      return { success: false, error: 'Invalid password' };
    }

    if (room.players.includes(playerId)) {
      return { success: false, error: 'Already in room' };
    }

    room.players.push(playerId);

    if (room.players.length === room.maxPlayers) {
      room.status = 'playing';
    }

    return { success: true, room };
  }

  leaveRoom(roomId, playerId) {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found' };

    const playerIndex = room.players.indexOf(playerId);
    if (playerIndex === -1) return { success: false, error: 'Not in room' };

    room.players.splice(playerIndex, 1);

    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      return { success: true, roomDeleted: true };
    }

    if (room.host === playerId) {
      room.host = room.players[0];
    }

    room.status = 'waiting';
    return { success: true, room };
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  getRoomList() {
    return Array.from(this.rooms.values())
      .filter(room => room.status === 'waiting')
      .map(room => ({
        id: room.id,
        host: room.host,
        players: room.players.length,
        maxPlayers: room.maxPlayers,
        hasPassword: !!room.password
      }));
  }

  addToWaitingList(playerId) {
    if (!this.waitingPlayers.includes(playerId)) {
      this.waitingPlayers.push(playerId);
    }
    return this.waitingPlayers.length;
  }

  removeFromWaitingList(playerId) {
    const index = this.waitingPlayers.indexOf(playerId);
    if (index > -1) {
      this.waitingPlayers.splice(index, 1);
    }
  }

  findMatch(playerId) {
    if (this.waitingPlayers.length < 2) {
      return null;
    }

    const index = this.waitingPlayers.indexOf(playerId);
    if (index === -1) return null;

    // Find another player
    const otherIndex = index === 0 ? 1 : 0;
    const otherPlayerId = this.waitingPlayers[otherIndex];

    // Remove both from waiting list
    this.removeFromWaitingList(playerId);
    this.removeFromWaitingList(otherPlayerId);

    // Create a room for them
    const room = this.createRoom(playerId);
    this.joinRoom(room.id, otherPlayerId);

    return room;
  }

  generateRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

module.exports = RoomManager;

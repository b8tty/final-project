let io = null;

function init(server) {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: { origin: '*' },
  });
  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized. Call init(server) first.');
  }
  return io;
}

module.exports = { init, getIO };

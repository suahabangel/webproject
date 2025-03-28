
const socketIO = require('socket.io');

let io;

const initSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('🧑‍⚕️ 새 사용자 접속:', socket.id);

    socket.on('sim-update', (data) => {
      socket.broadcast.emit('sim-update', data); // 다른 사용자에게 전달
    });

    
  socket.on('chat-message', (data) => {
    io.emit('chat-message', data); // 전체 사용자에게 전달
  });

  socket.on('disconnect', () => {
      console.log('❌ 사용자 퇴장:', socket.id);
    });
  });
};

module.exports = initSocket;

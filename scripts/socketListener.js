const io = require('socket.io-client');

const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('connected', socket.id);
});

socket.on('rate:update', (data) => {
  console.log('rate:update received', data);
});

socket.on('disconnect', () => console.log('disconnected'));

// keep running
setInterval(() => {}, 1000);

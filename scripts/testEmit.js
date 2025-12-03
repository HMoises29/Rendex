const io = require('socket.io-client');
const axios = require('axios');

(async function () {
  const socket = io('http://localhost:3000');
  socket.on('connect', () => console.log('client connected', socket.id));
  socket.on('rate:update', (d) => console.log('client received rate:update', d));

  // wait for connection
  await new Promise((r) => socket.once('connect', r));

  try {
    const login = await axios.post('http://localhost:3000/api/auth/login', {
      username: 'admin',
      password: 'changeme123',
    });
    const token = login.data.token;
    console.log('got token', token.slice(0, 20) + '...');
    const resp = await axios.put(
      'http://localhost:3000/api/settings',
      { key: 'exchange_rate', value: '270.000000' },
      { headers: { Authorization: 'Bearer ' + token } }
    );
    console.log('put resp', resp.data);
  } catch (e) {
    console.error('http error', e.response ? e.response.data : e.message);
  }

  // wait a bit to get event
  await new Promise((r) => setTimeout(r, 1500));
  socket.close();
  process.exit(0);
})();

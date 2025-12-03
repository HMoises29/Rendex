const request = require('supertest');
const { app, server } = require('../src/server');
const ioClient = require('socket.io-client');
const expect = require('chai').expect;

describe('Socket.IO rate:update', function () {
  let srv;
  before(function (done) {
    // start server on random port
    srv = server.listen(0, () => done());
  });
  after(function (done) {
    if (srv && srv.close) srv.close(done);
    else done();
  });

  it('emits rate:update after PUT /api/settings', async function () {
    this.timeout(7000);
    const port = srv.address().port;

    // connect socket client
    const socket = ioClient.connect(`http://localhost:${port}`, {
      reconnectionDelay: 0,
      forceNew: true,
      transports: ['websocket'],
    });

    await new Promise((resolve, reject) => {
      socket.on('connect', () => resolve());
      setTimeout(() => reject(new Error('socket did not connect')), 2000);
    });

    // login
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'changeme123' });
    const token = login.body && login.body.token;

    const got = new Promise((resolve, reject) => {
      socket.on('rate:update', (data) => resolve(data));
      setTimeout(() => reject(new Error('did not receive rate:update')), 3000);
    });

    // perform settings update that triggers emission
    await request(app)
      .put('/api/settings')
      .set('Authorization', 'Bearer ' + token)
      .send({ key: 'exchange_rate', value: '123.456' })
      .expect(200);

    const data = await got;
    expect(data).to.have.property('rate');
    expect(Number(data.rate)).to.equal(123.456);

    socket.close();
  });
});

const request = require('supertest');
const { knex } = require('../src/db');
const { app } = require('../src/server');
const expect = require('chai').expect;

describe('Settings API', function () {
  let token;
  before(async function () {
    // ensure admin exists (query returns undefined if not present)
    await knex('users').where({ username: 'admin' }).first();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'changeme123' });
    token = res.body && res.body.token;
  });

  it('PUT /api/settings requires auth and saves exchange_rate', async function () {
    // unauthenticated should be 401
    await request(app)
      .put('/api/settings')
      .send({ key: 'exchange_rate', value: '100.123' })
      .expect(401);

    // authenticated
    const r = await request(app)
      .put('/api/settings')
      .set('Authorization', 'Bearer ' + token)
      .send({ key: 'exchange_rate', value: '100.123' })
      .expect(200);
    expect(r.body).to.have.property('ok', true);

    // check DB persisted value_number
    const row = await knex('settings').where({ key: 'exchange_rate' }).first();
    expect(row).to.exist;
    const expected = Math.round(100.123 * 1e6);
    expect(Number(row.value_number)).to.equal(expected);
  });
});

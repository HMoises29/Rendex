const request = require('supertest');
const { knex } = require('../src/db');
const { app } = require('../src/server');
const expect = require('chai').expect;

describe('/api/ventas', function () {
  let token;
  before(async function () {
    // ensure admin and get token
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'changeme123' });
    token = res.body && res.body.token;
  });

  it('creates sale, decrements stock and logs batch_movements (happy path)', async function () {
    // create product and batch
    const [pid] = await knex('products').insert({
      sku: 'TST-' + Date.now(),
      name: 'Prod Test',
      stock_units: 5,
      price_usd_cents: 500,
    });
    await knex('batches').insert({
      product_id: pid,
      batch_code: 'B1',
      quantity: 5,
      date_caducidad: '2030-01-01',
    });

    const payload = {
      user_id: 1,
      items: [{ product_id: pid, variant_id: null, quantity_units: 2, unit_price_usd_cents: 500 }],
      payments: [{ method: 'EFECTIVO_USD', amount_cents: 1000, currency: 'USD' }],
    };

    const r = await request(app)
      .post('/api/ventas')
      .set('Authorization', 'Bearer ' + token)
      .send(payload)
      .expect(200);
    expect(r.body).to.have.property('ok', true);

    const prod = await knex('products').where({ id: pid }).first();
    expect(Number(prod.stock_units)).to.equal(3);

    const movements = await knex('batch_movements').where({ product_id: pid });
    expect(movements.length).to.be.greaterThan(0);
  });

  it('rolls back transaction on insufficient stock (no partial changes)', async function () {
    // create product with 1 unit
    const [pid] = await knex('products').insert({
      sku: 'TST-ROLL-' + Date.now(),
      name: 'Prod Roll',
      stock_units: 1,
      price_usd_cents: 500,
    });
    await knex('batches').insert({
      product_id: pid,
      batch_code: 'B1',
      quantity: 1,
      date_caducidad: '2030-01-01',
    });

    const payload = {
      user_id: 1,
      items: [{ product_id: pid, variant_id: null, quantity_units: 2, unit_price_usd_cents: 500 }],
      payments: [],
    };
    // expect failure
    const r = await request(app)
      .post('/api/ventas')
      .set('Authorization', 'Bearer ' + token)
      .send(payload);
    expect(r.status).to.be.oneOf([400, 500]);

    // ensure product stock unchanged and no batch_movements for pid
    const prod = await knex('products').where({ id: pid }).first();
    expect(Number(prod.stock_units)).to.equal(1);
    const movements = await knex('batch_movements').where({ product_id: pid });
    expect(movements.length).to.equal(0);
  });
});

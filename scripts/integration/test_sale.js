const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const { execSync } = require('child_process');

const DB_PATH = 'db/pos.sqlite';
const BASE = 'http://localhost:3000';

function runSql(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function getOne(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function allRows(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function ensureAdmin() {
  try {
    await axios.post(
      BASE + '/api/auth/login',
      { username: 'admin', password: 'changeme123' },
      { timeout: 3000 }
    );
    return;
  } catch (e) {
    console.log('Admin login failed or not present. Creating admin via script...');
    execSync('node scripts/createAdmin.js admin changeme123', { stdio: 'inherit' });
  }
}

async function waitServer() {
  // /api/settings may be protected; check root '/' for availability
  for (let i = 0; i < 10; i++) {
    try {
      await axios.get(BASE + '/', { timeout: 2000 });
      return;
    } catch (e) {
      // if server responded with HTTP error (e.g., 404) consider it up
      if (e && e.response) return;
      console.log('Esperando servidor...');
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error('Servidor no disponible en ' + BASE);
}

async function main() {
  try {
    await waitServer();
    await ensureAdmin();
    const login = await axios.post(BASE + '/api/auth/login', {
      username: 'admin',
      password: 'changeme123',
    });
    const token = login.data && login.data.token;
    if (!token) throw new Error('No se obtuvo token al autenticar admin');

    const db = new sqlite3.Database(DB_PATH);

    // create a product
    const prod = await runSql(
      db,
      `INSERT INTO products (sku, name, stock_units, price_usd_cents) VALUES (?,?,?,?)`,
      ['TESTSKU-' + Date.now(), 'Producto de Prueba', 10, 500]
    );
    const productId = prod.lastID;
    console.log('Producto creado id=', productId);

    // create a batch for that product (schema uses batch_code)
    await runSql(
      db,
      `INSERT INTO batches (product_id, batch_code, quantity, date_caducidad) VALUES (?,?,?,?)`,
      [productId, 'LOT-1', 10, '2030-01-01']
    );
    console.log('Lote creado');

    // prepare sale payload (2 units)
    const payload = {
      user_id: 1,
      items: [
        { product_id: productId, variant_id: null, quantity_units: 2, unit_price_usd_cents: 500 },
      ],
      payments: [{ method: 'EFECTIVO_USD', amount_cents: 1000, currency: 'USD' }],
    };

    console.log('Enviando POST /api/ventas ...');
    let resp;
    try {
      resp = await axios.post(BASE + '/api/ventas', payload, {
        headers: { Authorization: 'Bearer ' + token },
        timeout: 5000,
      });
      console.log('Respuesta ventas:', resp.data);
    } catch (e) {
      console.error(
        'Error al llamar /api/ventas:',
        e.response && e.response.status,
        (e.response && e.response.data) || e.message
      );
      throw e;
    }

    // verify DB: latest sale
    const sale = await getOne(db, 'SELECT * FROM sales ORDER BY id DESC LIMIT 1');
    console.log('Última fila en sales:', sale);

    const prodAfter = await getOne(db, 'SELECT * FROM products WHERE id = ?', [productId]);
    console.log('Producto tras venta:', prodAfter);

    const movements = await allRows(db, 'SELECT * FROM batch_movements WHERE product_id = ?', [
      productId,
    ]);
    console.log('Batch movements for product:', movements);

    // Basic assertions
    const saleOk = !!sale;
    const stockDecreased = prodAfter && Number(prodAfter.stock_units) === 8;
    const movementsOk = movements && movements.length > 0;

    console.log(
      '\nRESUMEN: saleOk=',
      saleOk,
      'stockDecreased=',
      stockDecreased,
      'batchMovements=',
      movementsOk
    );

    db.close();
    process.exit(saleOk && stockDecreased && movementsOk ? 0 : 2);
  } catch (err) {
    console.error('ERROR en test:', err.message || err);
    process.exit(3);
  }
}

main();

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

app.use(bodyParser.json());

// Static views
app.use('/public', express.static(path.resolve(__dirname, '..', 'public')));

// Routes
const { knex } = require('./db');
app.use('/api/auth', require('./routes/auth'));
app.use('/api/ventas', require('./routes/ventas'));
app.use('/api/settings', require('./routes/settings'));

// Inventory cache (simple cache endpoint)
app.get('/api/inventory/cache', async (req, res) => {
  try {
    const rows = await knex('products').select('id', 'sku', 'barcode', 'name', 'price_usd_cents');
    res.json(rows);
  } catch (err) {
    console.error('Cache error', err);
    res.status(500).json([]);
  }
});

// Health
app.get('/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Attach io to app for routes/services and register connection handlers
app.set('io', io);
io.on('connection', (socket) => {
  console.log('Socket.IO connected:', socket.id);
  socket.on('disconnect', () => console.log('Socket.IO disconnected:', socket.id));
});

// Basic server start (only when run directly)
const PORT = process.env.PORT || 3000;
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Rendex POS server listening on port ${PORT}`);
  });
}

module.exports = { app, server, io };

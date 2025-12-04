const express = require('express');
const { knex } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/settings - retorna todas las configuraciones como objeto { key: value }
router.get('/', authenticate, authorize(['admin', 'moderador']), async (req, res) => {
  try {
    const rows = await knex('settings').select('key', 'value', 'value_number', 'updated_at');
    const out = {};
    for (const r of rows)
      out[r.key] = { value: r.value, value_number: r.value_number, updated_at: r.updated_at };
    res.json(out);
  } catch (err) {
    console.error('settings:get', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/settings - upsert a single setting { key, value }
router.put('/', authenticate, authorize(['admin', 'moderador']), async (req, res) => {
  const { key, value } = req.body || {};
  if (!key) return res.status(400).json({ error: 'Missing key' });
  try {
    // compute value_number for exchange_rate if key matches
    let value_number = null;
    if (key === 'exchange_rate') {
      const rate = Number(value);
      if (Number.isNaN(rate)) return res.status(400).json({ error: 'Invalid exchange rate' });
      value_number = Math.round(rate * 1e6);
    }

    // upsert
    const existing = await knex('settings').where({ key }).first();
    if (existing) {
      await knex('settings')
        .where({ id: existing.id })
        .update({ value: String(value), value_number, updated_at: knex.fn.now() });
    } else {
      await knex('settings').insert({ key, value: String(value), value_number });
    }

    // audit
    try {
      await knex('audits').insert({
        user_id: req.user.user_id || null,
        action: 'update',
        resource: 'settings',
        resource_id: key,
        payload: JSON.stringify({ value, value_number }),
      });
    } catch (auditErr) {
      console.error('audit write failed', auditErr);
    }

    // emit rate update if exchange_rate
    // try to get io instance from app, fallback to server export
    let io = req.app.get('io');
    if (!io) {
      try {
        io = require('../server').io;
      } catch (e) {
        io = null;
      }
    }
    if (key === 'exchange_rate' && io) {
      const rateFloat = Number(value);
      io.emit('rate:update', { rate: rateFloat, micro: value_number });
    }

    res.json({ ok: true, key, value, value_number });
  } catch (err) {
    console.error('settings:put', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

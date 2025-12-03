const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { knex } = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change_me';

router.post('/login', async (req, res) => {
  const { username, password, barcode } = req.body;
  try {
    let user;
    if (barcode) {
      user = await knex('users').where({ barcode }).first();
    } else {
      user = await knex('users').where({ username }).first();
    }
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password || '', user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ user_id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

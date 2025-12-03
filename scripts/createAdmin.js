#!/usr/bin/env node
require('dotenv').config();
const bcrypt = require('bcrypt');
const { knex } = require('../src/db');

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node scripts/createAdmin.js <username> <password>');
    process.exit(1);
  }
  const [username, password] = args;
  try {
    const hash = await bcrypt.hash(password, 10);
    const exists = await knex('users').where({ username }).first();
    if (exists) {
      console.error('User already exists:', username);
      process.exit(1);
    }
    await knex('users').insert({ username, password_hash: hash, role: 'admin' });
    console.log('Admin user created:', username);
    process.exit(0);
  } catch (err) {
    console.error('Failed to create admin:', err.message);
    process.exit(1);
  }
}

main();

#!/usr/bin/env node
/*
  Script para crear un usuario administrador de prueba.
  Uso: node scripts/createAdmin.js [--email email] [--password pass]
  Por defecto: admin@rendex.com / password
*/
const bcrypt = require('bcrypt');
const { knex } = require('../src/db');

async function main() {
  const argv = process.argv.slice(2);
  const passArgIndex = argv.indexOf('--password');
  const username = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'admin';
  const password = (passArgIndex !== -1 && argv[passArgIndex + 1]) || 'password';

  const emailFlagIndex = argv.indexOf('--email');
  const emailForLog = (emailFlagIndex !== -1 && argv[emailFlagIndex + 1]) || 'admin@rendex.com';
  console.log(`Creating admin user: ${username} (${emailForLog})`);

  try {
    // check if users table exists
    const has = await knex.schema.hasTable('users');
    if (!has) {
      console.error('Table `users` does not exist. Run migrations first.');
      process.exit(1);
    }

    // check existing by username
    const existing = await knex('users').where({ username }).first();
    if (existing) {
      console.log('User already exists:', existing.username || username);
      process.exit(0);
    }

    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);

    const now = new Date().toISOString();
    const insert = {
      username: username,
      password_hash: hash,
      role: 'admin',
      created_at: now,
      updated_at: now,
    };

    const [id] = await knex('users').insert(insert);
    console.log('Admin user created with id:', id);
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin user', err);
    process.exit(2);
  }
}

if (require.main === module) main();

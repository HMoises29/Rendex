const path = require('path');
const knexConfig = require(path.resolve(__dirname, '..', 'knexfile'));
const env = process.env.NODE_ENV || 'development';
const knex = require('knex')(knexConfig[env]);

async function enableForeignKeys() {
  await knex.raw('PRAGMA foreign_keys = ON');
}

enableForeignKeys().catch((err) => {
  console.error('Failed to enable foreign keys', err);
});

module.exports = {
  knex,
  transaction: (fn) => knex.transaction(fn),
};

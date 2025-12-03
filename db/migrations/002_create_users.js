exports.up = function (knex) {
  return knex.schema.createTable('users', function (t) {
    t.increments('id').primary();
    t.string('username').notNullable().unique();
    t.string('password_hash').notNullable();
    t.string('barcode').nullable();
    t.enu('role', ['admin', 'moderador', 'empleado']).notNullable().defaultTo('empleado');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('users');
};

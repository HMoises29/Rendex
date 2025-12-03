exports.up = function (knex) {
  return knex.schema.createTable('sales', function (t) {
    t.increments('id').primary();
    t.string('uuid').notNullable().unique();
    t.integer('user_id').unsigned().nullable();
    t.integer('total_usd_cents').notNullable().defaultTo(0);
    t.bigInteger('tasa_usd_registrada_micro').notNullable().defaultTo(0);
    t.enu('status', ['closed', 'refunded', 'open']).notNullable().defaultTo('closed');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.foreign('user_id').references('users.id').onDelete('SET NULL');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('sales');
};

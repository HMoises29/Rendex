exports.up = function (knex) {
  return knex.schema.createTable('settings', function (t) {
    t.increments('id').primary();
    t.string('key').notNullable().unique();
    t.text('value');
    t.bigInteger('value_number');
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('settings');
};

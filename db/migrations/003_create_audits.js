exports.up = function (knex) {
  return knex.schema.createTable('audits', function (t) {
    t.increments('id').primary();
    t.integer('user_id').unsigned().nullable();
    t.string('action').notNullable();
    t.string('resource').notNullable();
    t.string('resource_id').nullable();
    t.text('payload').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.foreign('user_id').references('users.id').onDelete('SET NULL');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('audits');
};

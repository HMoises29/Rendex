exports.up = function (knex) {
  return knex.schema.createTable('variants', function (t) {
    t.increments('id').primary();
    t.integer('product_id').unsigned().notNullable();
    t.string('name').notNullable();
    t.integer('units_per_variant').notNullable().defaultTo(1);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.foreign('product_id').references('products.id').onDelete('CASCADE');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('variants');
};

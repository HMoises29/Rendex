exports.up = function (knex) {
  return knex.schema.createTable('products', function (t) {
    t.increments('id').primary();
    t.string('sku').notNullable().unique();
    t.string('barcode').nullable();
    t.string('name').notNullable();
    t.text('description').nullable();
    t.integer('price_usd_cents').notNullable().defaultTo(0);
    t.integer('stock_units').notNullable().defaultTo(0);
    t.integer('stock_minimo').notNullable().defaultTo(0);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('products');
};

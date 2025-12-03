exports.up = function (knex) {
  return knex.schema.createTable('sale_items', function (t) {
    t.increments('id').primary();
    t.integer('sale_id').unsigned().notNullable();
    t.integer('product_id').unsigned().notNullable();
    t.integer('variant_id').unsigned().nullable();
    t.integer('quantity_units').notNullable().defaultTo(1);
    t.integer('unit_price_usd_cents').notNullable().defaultTo(0);
    t.integer('total_price_usd_cents').notNullable().defaultTo(0);
    t.foreign('sale_id').references('sales.id').onDelete('CASCADE');
    t.foreign('product_id').references('products.id').onDelete('RESTRICT');
    t.foreign('variant_id').references('variants.id').onDelete('SET NULL');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('sale_items');
};

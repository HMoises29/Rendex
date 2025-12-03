exports.up = function (knex) {
  return knex.schema.createTable('batch_movements', function (t) {
    t.increments('id').primary();
    t.integer('batch_id').unsigned().notNullable();
    t.integer('sale_id').unsigned().nullable();
    t.integer('product_id').unsigned().notNullable();
    t.integer('quantity_changed').notNullable(); // negative for decrement
    t.integer('previous_quantity').notNullable();
    t.integer('new_quantity').notNullable();
    t.integer('user_id').unsigned().nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.foreign('batch_id').references('batches.id').onDelete('CASCADE');
    t.foreign('sale_id').references('sales.id').onDelete('SET NULL');
    t.foreign('product_id').references('products.id').onDelete('CASCADE');
    t.foreign('user_id').references('users.id').onDelete('SET NULL');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('batch_movements');
};

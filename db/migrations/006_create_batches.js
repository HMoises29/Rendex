exports.up = function (knex) {
  return knex.schema.createTable('batches', function (t) {
    t.increments('id').primary();
    t.integer('product_id').unsigned().notNullable();
    t.string('batch_code').nullable();
    t.integer('quantity').notNullable().defaultTo(0);
    t.date('date_caducidad').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.foreign('product_id').references('products.id').onDelete('CASCADE');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('batches');
};

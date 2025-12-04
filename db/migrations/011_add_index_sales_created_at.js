exports.up = function(knex) {
  return knex.schema.hasTable('sales').then(function(exists) {
    if (!exists) return Promise.resolve();
    // create index on created_at to speed up range queries
    return knex.schema.table('sales', function(t) {
      t.index('created_at', 'idx_sales_created_at');
    });
  });
};

exports.down = function(knex) {
  return knex.schema.hasTable('sales').then(function(exists) {
    if (!exists) return Promise.resolve();
    return knex.schema.table('sales', function(t) {
      t.dropIndex('created_at', 'idx_sales_created_at');
    });
  });
};

exports.up = function (knex) {
  return knex.schema.createTable('payments', function (t) {
    t.increments('id').primary();
    t.integer('sale_id').unsigned().notNullable();
    t.enu('method', ['EFECTIVO_USD', 'EFECTIVO_VES', 'PAGO_MOVIL', 'DEBITO_TARJETA']).notNullable();
    t.integer('amount_cents').notNullable().defaultTo(0);
    t.string('currency').notNullable().defaultTo('USD');
    t.string('reference').nullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.foreign('sale_id').references('sales.id').onDelete('CASCADE');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('payments');
};

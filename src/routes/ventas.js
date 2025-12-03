const express = require('express');
const { transaction } = require('../db');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// POST /api/ventas
router.post('/', async (req, res) => {
  const payload = req.body; // expect { items: [...], payments: [...], user_id }
  try {
    await transaction(async (trx) => {
      const saleUuid = uuidv4();
      const tasaRow = await trx('settings').where({ key: 'exchange_rate' }).first();
      const tasa_micro = tasaRow ? BigInt(tasaRow.value_number || 0) : BigInt(0);

      // Pre-checks: compute totals and validate stock/batches availability
      let total_usd_cents = 0;
      for (const it of payload.items) {
        if (!it.product_id || !it.unit_price_usd_cents || !it.quantity_units) {
          throw new Error('Invalid item payload');
        }
        const product = await trx('products').where({ id: it.product_id }).first();
        if (!product) throw new Error('Product not found: ' + it.product_id);

        // determine units per sold unit (variant conversion)
        let units_per_variant = 1;
        if (it.variant_id) {
          const variant = await trx('variants').where({ id: it.variant_id }).first();
          if (!variant) throw new Error('Variant not found: ' + it.variant_id);
          units_per_variant = variant.units_per_variant || 1;
        }

        const units_required = Number(it.quantity_units) * Number(units_per_variant);

        // product total stock check
        if (product.stock_units < units_required) {
          throw new Error(`Insufficient stock for product ${product.sku || product.id}`);
        }

        // batches total check
        const batchSumRow = await trx('batches')
          .where({ product_id: it.product_id })
          .sum('quantity as total');
        const batchTotal = (batchSumRow && batchSumRow[0] && batchSumRow[0].total) || 0;
        if (batchTotal < units_required) {
          throw new Error(`Insufficient batch quantities for product ${product.sku || product.id}`);
        }

        total_usd_cents += Number(it.unit_price_usd_cents) * Number(it.quantity_units);
      }

      // Insert sale
      const [saleId] = await trx('sales').insert({
        uuid: saleUuid,
        user_id: payload.user_id || null,
        total_usd_cents: total_usd_cents,
        tasa_usd_registrada_micro: Number(tasa_micro),
      });

      // Insert items and decrement stock/batches (FIFO by date_caducidad)
      for (const it of payload.items) {
        const product = await trx('products').where({ id: it.product_id }).first();
        const variant = it.variant_id
          ? await trx('variants').where({ id: it.variant_id }).first()
          : null;
        const units_per_variant = variant ? variant.units_per_variant || 1 : 1;
        const units_required = Number(it.quantity_units) * Number(units_per_variant);

        // insert sale item
        await trx('sale_items').insert({
          sale_id: saleId,
          product_id: it.product_id,
          variant_id: it.variant_id || null,
          quantity_units: it.quantity_units,
          unit_price_usd_cents: it.unit_price_usd_cents,
          total_price_usd_cents: Number(it.unit_price_usd_cents) * Number(it.quantity_units),
        });

        // decrement product stock
        await trx('products').where({ id: product.id }).decrement('stock_units', units_required);

        // decrement batches FIFO by date_caducidad asc and record batch_movements
        let remaining = units_required;
        while (remaining > 0) {
          const batch = await trx('batches')
            .where({ product_id: product.id })
            .andWhere('quantity', '>', 0)
            .orderBy('date_caducidad', 'asc')
            .first();
          if (!batch)
            throw new Error(`Not enough batch quantity for product ${product.sku || product.id}`);
          const take = Math.min(remaining, batch.quantity);
          const prevQty = Number(batch.quantity);
          const newQty = prevQty - take;
          // update batch quantity explicitly (within transaction)
          await trx('batches').where({ id: batch.id }).update({ quantity: newQty });
          // record movement (negative quantity_changed)
          await trx('batch_movements').insert({
            batch_id: batch.id,
            sale_id: saleId,
            product_id: product.id,
            quantity_changed: -take,
            previous_quantity: prevQty,
            new_quantity: newQty,
            user_id: payload.user_id || null,
          });
          remaining -= take;
        }
      }

      // record payments
      for (const p of payload.payments || []) {
        await trx('payments').insert({
          sale_id: saleId,
          method: p.method,
          amount_cents: p.amount_cents,
          currency: p.currency || 'USD',
          reference: p.reference || null,
        });
      }

      res.json({ ok: true, sale_id: saleId, uuid: saleUuid });
    });
  } catch (err) {
    console.error('Venta error', err);
    res.status(500).json({ error: err.message || 'Transaction failed' });
  }
});

module.exports = router;

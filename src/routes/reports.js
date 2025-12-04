const express = require('express');
const { knex } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/reports/sales-summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get(
  '/sales-summary',
  authenticate,
  authorize(['admin', 'moderador', 'gerente']),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query || {};
      if (!startDate || !endDate)
        return res.status(400).json({ error: 'startDate and endDate are required (YYYY-MM-DD)' });

      // Normalize dates to include whole days
      const start = `${startDate} 00:00:00`;
      const end = `${endDate} 23:59:59`;

      const row = await knex('sales')
        .whereBetween('created_at', [start, end])
        .select(
          knex.raw('COALESCE(SUM(total_usd_cents),0) as total_usd_cents'),
          knex.raw(
            'COALESCE(SUM(total_usd_cents * tasa_usd_registrada_micro),0) as total_weighted_micro'
          ),
          knex.raw('COALESCE(COUNT(*),0) as count_transactions')
        )
        .first();

      const totalUsdCents = Number(row.total_usd_cents || 0);
      const totalWeightedMicro = Number(row.total_weighted_micro || 0);

      // total VES cents = round(totalWeightedMicro / 1e6)
      const totalVesCents = Math.round(totalWeightedMicro / 1e6);

      const result = {
        total_sales_usd: (totalUsdCents / 100).toFixed(2),
        total_sales_ves: (totalVesCents / 100).toFixed(2),
        count_of_transactions: Number(row.count_transactions || 0),
      };

      res.json(result);
    } catch (err) {
      console.error('reports:sales-summary', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// GET /api/reports/sales-detail?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&limit=50&offset=0
router.get(
  '/sales-detail',
  authenticate,
  authorize(['admin', 'moderador', 'gerente']),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query || {};
      if (!startDate || !endDate)
        return res.status(400).json({ error: 'startDate and endDate are required (YYYY-MM-DD)' });

      const start = `${startDate} 00:00:00`;
      const end = `${endDate} 23:59:59`;

      // pagination
      let limit = parseInt(req.query.limit, 10);
      let offset = parseInt(req.query.offset, 10);
      if (Number.isNaN(limit) || limit <= 0) limit = 50;
      if (Number.isNaN(offset) || offset < 0) offset = 0;
      // cap limit to avoid abuse
      const MAX_LIMIT = 1000;
      if (limit > MAX_LIMIT) limit = MAX_LIMIT;

      // total count (ignoring limit/offset)
      const countRow = await knex('sales')
        .whereBetween('created_at', [start, end])
        .count({ total: '*' })
        .first();
      const totalCount = Number(countRow.total || 0);

      const rows = await knex('sales')
        .whereBetween('created_at', [start, end])
        .select('uuid', 'total_usd_cents', 'tasa_usd_registrada_micro', 'created_at')
        .orderBy('created_at', 'asc')
        .limit(limit)
        .offset(offset);

      const out = rows.map((r) => {
        const totalUsdCents = Number(r.total_usd_cents || 0);
        const tasaMicro = Number(r.tasa_usd_registrada_micro || 0);
        const totalVesCents = Math.round((totalUsdCents * tasaMicro) / 1e6);
        return {
          uuid: r.uuid,
          total_usd_cents: totalUsdCents,
          total_ves_calculated: totalVesCents,
          created_at: r.created_at,
          tasa_usd_registrada_micro: tasaMicro,
        };
      });

      res.json({ total_count: totalCount, limit, offset, rows: out });
    } catch (err) {
      console.error('reports:sales-detail', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// GET /api/reports/sales-export?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get(
  '/sales-export',
  authenticate,
  authorize(['admin', 'moderador', 'gerente']),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query || {};
      if (!startDate || !endDate)
        return res.status(400).json({ error: 'startDate and endDate are required (YYYY-MM-DD)' });

      const start = `${startDate} 00:00:00`;
      const end = `${endDate} 23:59:59`;

      // Set headers for streaming CSV
      const filename = `reportes-${startDate}_${endDate}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // lazy-require csv-stringify to avoid startup error if not installed
      const { stringify } = require('csv-stringify');
      const { Transform } = require('stream');

      // columns mapping for object input
      const columns = {
        uuid: 'uuid',
        total_usd_cents: 'total_usd_cents',
        total_ves_calculated: 'total_ves_calculated',
        created_at: 'created_at',
        tasa_usd_registrada_micro: 'tasa_usd_registrada_micro',
      };

      // create CSV stringifier that accepts objects
      const stringifier = stringify({ header: true, columns });

      // Transform rows: compute total_ves_calculated and pass object downstream
      const rowTransform = new Transform({
        objectMode: true,
        transform(row, encoding, callback) {
          try {
            const totalUsdCents = Number(row.total_usd_cents || 0);
            const tasaMicro = Number(row.tasa_usd_registrada_micro || 0);
            const totalVesCents = Math.round((totalUsdCents * tasaMicro) / 1e6);
            const out = {
              uuid: row.uuid,
              total_usd_cents: totalUsdCents,
              total_ves_calculated: totalVesCents,
              created_at: row.created_at,
              tasa_usd_registrada_micro: tasaMicro,
            };
            callback(null, out);
          } catch (e) {
            callback(e);
          }
        },
      });

      // create knex stream (readable object stream of rows)
      const query = knex('sales')
        .whereBetween('created_at', [start, end])
        .select('uuid', 'total_usd_cents', 'tasa_usd_registrada_micro', 'created_at')
        .orderBy('created_at', 'asc')
        .stream();

      // pipe: knex stream -> transform -> csv stringifier -> response
      query.on('error', (err) => {
        console.error('reports:sales-export stream error (query):', err);
        // if headers not sent, send error status
        if (!res.headersSent) res.status(500).end('Server error');
        else res.end();
      });

      rowTransform.on('error', (err) => {
        console.error('reports:sales-export stream error (transform):', err);
        if (!res.headersSent) res.status(500).end('Server error');
        else res.end();
      });

      stringifier.on('error', (err) => {
        console.error('reports:sales-export stream error (stringify):', err);
        if (!res.headersSent) res.status(500).end('Server error');
        else res.end();
      });

      // Pipe streams. Ensure response ends when stringifier finishes.
      query.pipe(rowTransform).pipe(stringifier).pipe(res);
    } catch (err) {
      console.error('reports:sales-export', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;

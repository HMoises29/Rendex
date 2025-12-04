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

      const rows = await knex('sales')
        .whereBetween('created_at', [start, end])
        .select('uuid', 'total_usd_cents', 'tasa_usd_registrada_micro', 'created_at')
        .orderBy('created_at', 'asc');

      // build CSV
      const headers = [
        'uuid',
        'total_usd_cents',
        'total_ves_calculated',
        'created_at',
        'tasa_usd_registrada_micro',
      ];
      const lines = [headers.join(',')];
      for (const r of rows) {
        const totalUsdCents = Number(r.total_usd_cents || 0);
        const tasaMicro = Number(r.tasa_usd_registrada_micro || 0);
        const totalVesCents = Math.round((totalUsdCents * tasaMicro) / 1e6);
        const row = [
          r.uuid,
          String(totalUsdCents),
          String(totalVesCents),
          r.created_at,
          String(tasaMicro),
        ].map((cell) => {
          if (cell == null) return '';
          const s = String(cell);
          if (s.includes(',') || s.includes('"') || s.includes('\n'))
            return '"' + s.replace(/"/g, '""') + '"';
          return s;
        });
        lines.push(row.join(','));
      }

      const csv = lines.join('\n');
      const filename = `reportes-${startDate}_${endDate}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (err) {
      console.error('reports:sales-export', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;

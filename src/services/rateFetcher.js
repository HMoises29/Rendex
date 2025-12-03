const axios = require('axios');
const { knex } = require('../db');

const RATE_URL = process.env.RATE_URL || 'https://api.dolarvzla.com/public/exchange-rate';

async function fetchRateWithRetry(retries = 3) {
  let delay = 500;
  for (let i = 0; i < retries; i++) {
    try {
      const resp = await axios.get(RATE_URL, { timeout: 3000 });
      const data = resp.data;
      // primary: current.usd, fallback: data.current.usd or data.data.current.usd
      const usd =
        (data && data.current && data.current.usd) ||
        (data && data.data && data.data.current && data.data.current.usd) ||
        null;
      if (usd != null) return Number(usd);
    } catch (err) {
      // ignore and retry
    }
    await new Promise((r) => setTimeout(r, delay));
    delay *= 2;
  }
  throw new Error('rate fetch failed');
}

async function syncRate(io) {
  try {
    const rate = await fetchRateWithRetry();
    // convert to micro
    const micro = Math.round(Number(rate) * 1e6);
    // persist in settings
    const existing = await knex('settings').where({ key: 'exchange_rate' }).first();
    if (existing) {
      await knex('settings')
        .where({ id: existing.id })
        .update({ value: String(rate), value_number: micro, updated_at: knex.fn.now() });
    } else {
      await knex('settings').insert({
        key: 'exchange_rate',
        value: String(rate),
        value_number: micro,
      });
    }
    if (io) io.emit('rate:update', { rate, micro });
    return { rate, micro };
  } catch (err) {
    // fallback: return last saved rate
    const existing = await knex('settings').where({ key: 'exchange_rate' }).first();
    if (existing) return { rate: Number(existing.value), micro: Number(existing.value_number) };
    throw err;
  }
}

module.exports = { fetchRateWithRetry, syncRate };

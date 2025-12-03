# Rendex POS (esqueleto)

Proyecto POS offline (Venezuela) — Esqueleto inicial con Node.js, Express, SQLite3 y Knex para migraciones.

Setup rápido

1. Instalar dependencias:

```powershell
npm install
```

2. Ejecutar migraciones:

```powershell
npm run migrate
```

3. Iniciar servidor:

```powershell
npm start
```

Backups

El script `db:backup` copia `db/pos.sqlite` → `backups/pos-<timestamp>.sqlite`.

Ejecutar manualmente o programarlo con Task Scheduler (Windows) o cron (Linux):

```powershell
npm run db:backup
```

Notas

- La aritmética monetaria trabaja con enteros (céntimos) y la tasa se guarda en micro-unidades (1e6).
- Rate fetcher: `src/services/rateFetcher.js` consume `https://api.dolarvzla.com/public/exchange-rate` y persiste `current.usd`.

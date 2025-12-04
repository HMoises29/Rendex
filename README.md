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

4. Crear usuario administrador (seed)

```powershell
npm run create-admin -- --username admin@rendex.com --password password
```

Esto creará un usuario administrador de prueba. Cambia la contraseña en producción.

Backups

El script `db:backup` copia `db/pos.sqlite` → `backups/pos-<timestamp>.sqlite`.

Ejecutar manualmente o programarlo con Task Scheduler (Windows) o cron (Linux):

```powershell
npm run db:backup
```

Notas

- La aritmética monetaria trabaja con enteros (céntimos) y la tasa se guarda en micro-unidades (1e6).
- Rate fetcher: `src/services/rateFetcher.js` consume `https://api.dolarvzla.com/public/exchange-rate` y persiste `current.usd`.

Tests
-----

- Ejecutar tests unitarios:

```powershell
npm test
```

- Ejecutar tests E2E (Playwright). Instala navegadores antes de ejecutar por primera vez:

```powershell
npx playwright install --with-deps
npm run test:e2e
```

Credenciales de prueba
---------------------

- **Usuario:** `admin@rendex.com`
- **Contraseña:** `password`

Nota: estas credenciales se usan en el entorno de desarrollo y tests E2E. Cámbialas antes de desplegar.

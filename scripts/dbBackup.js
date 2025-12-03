const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', 'db', 'pos.sqlite');
const backupsDir = path.resolve(__dirname, '..', 'backups');

if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

const now = new Date();
const stamp = now.toISOString().replace(/[:.]/g, '-');
const dest = path.join(backupsDir, `pos-${stamp}.sqlite`);

try {
  fs.copyFileSync(dbPath, dest);
  console.log('Backup saved to', dest);
} catch (err) {
  console.error('Backup failed:', err.message);
  process.exit(1);
}

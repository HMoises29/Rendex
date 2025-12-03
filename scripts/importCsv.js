const path = require('path');
const { Worker } = require('worker_threads');

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node scripts/importCsv.js <path-to-csv>');
  process.exit(1);
}

const worker = new Worker(path.resolve(__dirname, '..', 'src', 'workers', 'importInventory.js'));
worker.postMessage({ path: csvPath });
worker.on('message', (m) => {
  console.log('worker:', m);
  if (m.done) process.exit(0);
});
worker.on('error', (err) => {
  console.error('worker error', err);
  process.exit(1);
});

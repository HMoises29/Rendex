const { parentPort } = require('worker_threads');
const fs = require('fs');
// This worker is a stub: expects main thread to send { path }

parentPort.on('message', async (msg) => {
  const { path: csvPath } = msg;
  try {
    // Simple stub: count lines and report progress
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split(/\r?\n/).filter(Boolean);
    const total = lines.length;
    for (let i = 0; i < total; i++) {
      // pretend processing
      await new Promise((r) => setTimeout(r, 5));
      parentPort.postMessage({ progress: Math.round(((i + 1) / total) * 100) });
    }
    parentPort.postMessage({ done: true, total });
  } catch (err) {
    parentPort.postMessage({ error: String(err) });
  }
});

// app.js — MAX POWER stress test (authorized own infrastructure only)
// Usage: node app.js [durationSeconds] [workers]
// No rate limit — each worker fires requests back-to-back as fast as possible.

const http = require('http');
const https = require('https');

const TARGETS = [
  'corleoneonline.com/',
  'corleoneonline.com/',
  'tmsahff.com/'
];

const DURATION = (parseInt(process.argv[2] || '60', 10)) * 1000;
const WORKERS = parseInt(process.argv[3] || '2000', 10);

// Tune OS-level: max sockets, no Nagle delay
https.globalAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 10000,
  maxSockets: Infinity,
  maxFreeSockets: Infinity,
  scheduling: 'lifo'
});
http.globalAgent = new http.Agent({ keepAlive: true, maxSockets: Infinity });

let total = 0, ok = 0, err = 0, lastRps = 0, windowCount = 0, peakRps = 0;
const latencies = [];
const start = Date.now();
let running = true;

const PAYLOAD = JSON.stringify({
  user_id: 'maxtest',
  score: Math.floor(Math.random() * 1e9),
  ts: Date.now()
});
const HEADERS = {
  'Content-Type': 'application/json',
  'Content-Length': Buffer.byteLength(PAYLOAD),
  'Connection': 'keep-alive',
  'User-Agent': 'Mozilla/5.0 (compatible; loadtest/2.0)'
};

function fire() {
  if (!running) return;
  const target = TARGETS[(Math.random() * TARGETS.length) | 0];
  const u = new URL(target);
  const mod = u.protocol === 'http:' ? http : https;
  const t0 = process.hrtime.bigint();

  const req = mod.request({
    hostname: u.hostname,
    port: u.port || 443,
    path: u.pathname,
    method: 'POST',
    headers: HEADERS,
    timeout: 4000
  }, (res) => {
    res.resume();
    res.on('end', () => {
      total++; ok++; windowCount++;
      if (latencies.length < 200000) latencies.push(Number(process.hrtime.bigint() - t0) / 1e6);
      setImmediate(fire); // immediate next request — no delay
    });
  });
  req.on('timeout', () => { req.destroy(); total++; err++; windowCount++; setImmediate(fire); });
  req.on('error', () => { total++; err++; windowCount++; setImmediate(fire); });
  req.end(PAYLOAD);
}

for (let i = 0; i < WORKERS; i++) fire();

const statsTimer = setInterval(() => {
  const elapsed = (Date.now() - start) / 1000;
  lastRps = windowCount / 2;
  if (lastRps > peakRps) peakRps = lastRps;
  console.log(`[${elapsed.toFixed(0)}s] total=${total} ok=${ok} err=${err} rps=${lastRps} peak=${peakRps}`);
  windowCount = 0;
}, 2000);

setTimeout(() => {
  running = false;
  clearInterval(statsTimer);
  latencies.sort((a, b) => a - b);
  const p = (x) => latencies.length ? latencies[Math.floor(x / 100 * latencies.length)].toFixed(1) : '-';
  console.log('\n=== FINAL ===');
  console.log(`Total sent : ${total}`);
  console.log(`OK         : ${ok}`);
  console.log(`Errors/TO  : ${err}`);
  console.log(`Avg RPS    : ${(total / (DURATION / 1000)).toFixed(0)}`);
  console.log(`Peak RPS   : ${peakRps}`);
  console.log(`Latency ms -> p50: ${p(50)} | p95: ${p(95)} | p99: ${p(99)}`);
  process.exit(0);
}, DURATION);

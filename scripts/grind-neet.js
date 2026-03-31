#!/usr/bin/env node
/**
 * NEET Vanity Address Grinder
 * Finds Solana keypairs whose base58 public key ends with "neet"
 *
 * Usage:
 *   node grind-neet.js                     # grind 1 keypair
 *   node grind-neet.js --count 5           # grind 5 keypairs
 *   node grind-neet.js --threads 8         # use 8 CPU threads (default: all cores)
 *   node grind-neet.js --count 5 --pool    # output as JS pool array for neet-pad-client.js
 */

const { workerData, parentPort, isMainThread, Worker } = require('worker_threads');
const { Keypair } = require('@solana/web3.js');
const os   = require('os');
const path = require('path');
const fs   = require('fs');

const SUFFIX  = 'neet';
const args    = process.argv.slice(2);
const THREADS = parseInt(args[args.indexOf('--threads') + 1]) || os.cpus().length;
const COUNT   = parseInt(args[args.indexOf('--count') + 1]) || 1;
const POOL_OUTPUT = args.includes('--pool');

// ─── Worker thread ──────────────────────────────────────────────────────────
if (!isMainThread) {
  const { suffix } = workerData;
  let attempts = 0;
  while (true) {
    const kp = Keypair.generate();
    const pub = kp.publicKey.toBase58();
    attempts++;
    if (pub.toLowerCase().endsWith(suffix)) {
      parentPort.postMessage({ found: true, attempts, publicKey: pub, secretKey: Array.from(kp.secretKey) });
      // Keep going — parent will terminate workers when COUNT reached
      attempts = 0;
    } else if (attempts % 100_000 === 0) {
      parentPort.postMessage({ found: false, attempts: 100_000 });
      attempts = 0;
    }
  }
  return;
}

// ─── Main thread ─────────────────────────────────────────────────────────────
console.log(`\nGrinding for Solana address ending in "${SUFFIX}"...`);
console.log(`Threads: ${THREADS} | Target count: ${COUNT}`);
console.log(`Expected: ~${(58 ** SUFFIX.length / 1e6).toFixed(1)}M attempts per key\n`);

const startTime    = Date.now();
let totalAttempts  = 0;
let foundCount     = 0;
const results      = [];

function grindOne() {
  return new Promise((resolve) => {
    const workers = [];
    let done = false;

    for (let i = 0; i < THREADS; i++) {
      const w = new Worker(__filename, { workerData: { suffix: SUFFIX } });

      w.on('message', (msg) => {
        totalAttempts += msg.attempts || 0;
        if (msg.found && !done) {
          done = true;
          workers.forEach(ww => ww.terminate());
          resolve(msg);
        } else if (!msg.found) {
          const rate = Math.round(totalAttempts / ((Date.now() - startTime) / 1000));
          process.stdout.write(`\r[${foundCount + 1}/${COUNT}] ${totalAttempts.toLocaleString()} attempts | ${(rate / 1000).toFixed(0)}k/s  `);
        }
      });

      w.on('error', e => console.error('Worker error:', e.message));
      workers.push(w);
    }
  });
}

(async () => {
  while (foundCount < COUNT) {
    const found = await grindOne();
    foundCount++;

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n[${foundCount}/${COUNT}] Found: ${found.publicKey} (${elapsed}s total)`);

    results.push({ publicKey: found.publicKey, secretKey: found.secretKey });

    // Save individual keypair file
    const outFile = path.join(__dirname, `neet-mint-${found.publicKey.slice(-12)}.json`);
    fs.writeFileSync(outFile, JSON.stringify(found.secretKey));
    console.log(`  Saved: ${outFile}`);
  }

  // Output pool format
  if (POOL_OUTPUT) {
    console.log('\n// Paste into NEET_KEYPAIR_POOL in neet-pad-client.js:');
    results.forEach(r => {
      console.log(`  { publicKey: "${r.publicKey}", secretKey: [${r.secretKey.slice(0, 4).join(',')},...] },`);
    });
    // Save full pool JSON
    const poolFile = path.join(__dirname, 'neet-keypair-pool.json');
    fs.writeFileSync(poolFile, JSON.stringify(results, null, 2));
    console.log(`\nFull pool saved to: ${poolFile}`);
    console.log('Load in browser: fetch("scripts/neet-keypair-pool.json").then(r=>r.json()).then(pool=>pool.forEach(k=>NeetPad.addNeetKeypair(k.publicKey, k.secretKey)))');
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const rate = Math.round(totalAttempts / (Date.now() - startTime) * 1000);
  console.log(`\nDone! ${COUNT} keypair(s) in ${totalTime}s | avg speed: ${(rate/1000).toFixed(0)}k/s`);
  process.exit(0);
})();

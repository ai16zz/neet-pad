#!/usr/bin/env node
/**
 * NEET Vanity Address Grinder
 * Finds a Solana keypair whose base58 public key ends with "neet"
 * Uses Node.js worker threads for multi-core speed.
 *
 * Usage:
 *   node grind-neet.js                  # grinds until found, saves to neet-mint.json
 *   node grind-neet.js --threads 8      # use 8 CPU threads (default: all cores)
 *   node grind-neet.js --suffix neet    # custom suffix (default: "neet")
 */

const { workerData, parentPort, isMainThread, Worker } = require('worker_threads');
const { Keypair } = require('@solana/web3.js');
const os   = require('os');
const path = require('path');
const fs   = require('fs');

// ─── Config ──────────────────────────────────────────────────────────────────
const args   = process.argv.slice(2);
const SUFFIX  = args[args.indexOf('--suffix') + 1] || 'neet';
const THREADS = parseInt(args[args.indexOf('--threads') + 1]) || os.cpus().length;

// ─── Worker logic ─────────────────────────────────────────────────────────────
if (!isMainThread) {
  const { suffix } = workerData;
  let attempts = 0;
  while (true) {
    const kp = Keypair.generate();
    const pk = kp.publicKey.toBase58();
    attempts++;
    if (pk.endsWith(suffix)) {
      parentPort.postMessage({
        found: true,
        attempts,
        publicKey: pk,
        secretKey: Array.from(kp.secretKey),
      });
      break;
    }
    // Report progress every 100k attempts
    if (attempts % 100_000 === 0) {
      parentPort.postMessage({ found: false, attempts });
    }
  }
  return;
}

// ─── Main thread ──────────────────────────────────────────────────────────────
console.log(`\n🔍 Grinding for Solana address ending in "${SUFFIX}"...`);
console.log(`   Using ${THREADS} CPU threads\n`);
console.log(`   Expected attempts: ~${(58 ** SUFFIX.length).toLocaleString()}`);
console.log(`   (base58^${SUFFIX.length} = ${(58 ** SUFFIX.length / 1e6).toFixed(1)}M avg)\n`);

const startTime = Date.now();
let totalAttempts = 0;
let done = false;

const workers = [];
for (let i = 0; i < THREADS; i++) {
  const w = new Worker(__filename, { workerData: { suffix: SUFFIX } });

  w.on('message', (msg) => {
    totalAttempts += msg.attempts;

    if (msg.found && !done) {
      done = true;
      workers.forEach(ww => ww.terminate());

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate    = Math.round(totalAttempts / ((Date.now() - startTime) / 1000));

      console.log(`\n✅ FOUND after ${totalAttempts.toLocaleString()} attempts (${elapsed}s)`);
      console.log(`   Speed: ${rate.toLocaleString()} keypairs/sec`);
      console.log(`   Public Key: ${msg.publicKey}`);
      console.log(`   Ends with:  ...${msg.publicKey.slice(-SUFFIX.length)}\n`);

      // Save keypair
      const outFile = path.join(__dirname, `neet-mint-${msg.publicKey.slice(-8)}.json`);
      fs.writeFileSync(outFile, JSON.stringify(msg.secretKey));
      console.log(`💾 Keypair saved to: ${outFile}`);
      console.log(`\n⚠️  Keep this file SECRET — it is the mint authority.\n`);

    } else if (!msg.found && !done) {
      const rate = Math.round(totalAttempts / ((Date.now() - startTime) / 1000));
      process.stdout.write(`\r   Attempts: ${totalAttempts.toLocaleString()} | Speed: ${rate.toLocaleString()}/s`);
    }
  });

  w.on('error', (e) => console.error(`Worker error: ${e.message}`));
  workers.push(w);
}

#!/usr/bin/env node
/**
 * NEET PAD — One-time platform initialisation
 * Run ONCE after first deploy on a network.
 *
 * Usage:
 *   ANCHOR_WALLET=~/.config/solana/id.json \
 *   PROGRAM_ID=<deployed_program_id> \
 *   TREASURY=<treasury_wallet_pubkey> \
 *   NEET_MINT=<neet_token_mint_pubkey> \
 *   node scripts/initialize.js [--cluster devnet|mainnet-beta]
 */

const anchor = require('@coral-xyz/anchor');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const fs   = require('fs');
const path = require('path');

const args       = process.argv.slice(2);
const CLUSTER    = args[args.indexOf('--cluster') + 1] || 'devnet';
const PROGRAM_ID = process.env.PROGRAM_ID;
const TREASURY   = process.env.TREASURY;
const NEET_MINT  = process.env.NEET_MINT;
const WALLET_PATH = process.env.ANCHOR_WALLET || path.join(process.env.HOME, '.config/solana/id.json');

if (!PROGRAM_ID || !TREASURY || !NEET_MINT) {
  console.error('ERROR: Set PROGRAM_ID, TREASURY, and NEET_MINT env vars');
  process.exit(1);
}

const RPC = CLUSTER === 'mainnet-beta'
  ? 'https://api.mainnet-beta.solana.com'
  : 'https://api.devnet.solana.com';

async function main() {
  // Load wallet
  const rawKey = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf8'));
  const authority = Keypair.fromSecretKey(Uint8Array.from(rawKey));
  console.log('Authority:', authority.publicKey.toBase58());

  // Load IDL
  const idlPath = path.join(__dirname, '../target/idl/neet_pad.json');
  if (!fs.existsSync(idlPath)) {
    console.error('IDL not found at', idlPath, '— run anchor build first');
    process.exit(1);
  }
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));

  // Setup Anchor
  const connection = new Connection(RPC, 'confirmed');
  const wallet = new anchor.Wallet(authority);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  anchor.setProvider(provider);

  const programId = new PublicKey(PROGRAM_ID);
  // Anchor 0.32: programId is taken from idl.address; constructor is (idl, provider)
  const program   = new anchor.Program(idl, provider);

  // Derive platform state PDA
  const [platformState, bump] = await PublicKey.findProgramAddress(
    [Buffer.from('platform')],
    programId
  );
  console.log('Platform state PDA:', platformState.toBase58());

  // Check if already initialised
  try {
    const existing = await program.account.platformState.fetch(platformState);
    console.log('Platform already initialised!');
    console.log('  Treasury:', existing.treasury.toBase58());
    console.log('  NEET mint:', existing.neetMint.toBase58());
    process.exit(0);
  } catch {}

  // Send initialize tx
  console.log('\nInitialising platform...');
  console.log('  Treasury:', TREASURY);
  console.log('  NEET mint:', NEET_MINT);
  console.log('  Cluster:', CLUSTER);

  const sig = await program.methods
    .initialize(new PublicKey(TREASURY), new PublicKey(NEET_MINT))
    .accounts({
      platformState,
      authority: authority.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  console.log('\nInitialised! Signature:', sig);
  console.log('Explorer:', `https://explorer.solana.com/tx/${sig}?cluster=${CLUSTER}`);

  // Verify
  const state = await program.account.platformState.fetch(platformState);
  console.log('\nVerified platform state:');
  console.log('  Authority:   ', state.authority.toBase58());
  console.log('  Treasury:    ', state.treasury.toBase58());
  console.log('  NEET mint:   ', state.neetMint.toBase58());
  console.log('  Total raised:', state.totalRaised.toString());
}

main().catch(e => { console.error(e); process.exit(1); });

/**
 * NEET PAD — Frontend Client
 * Paste this into the site's fix block or serve as a module.
 * Requires: @solana/web3.js + @coral-xyz/anchor (loaded via CDN in the HTML)
 */

(function () {
  'use strict';

  // ─── Config (filled in after deploy) ─────────────────────────────────────
  const PROGRAM_ID   = 'NEETPadXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'; // set after deploy
  const TREASURY     = 'YOUR_TREASURY_WALLET_HERE';
  const NEET_MINT    = 'YOUR_NEET_TOKEN_MINT_HERE';
  const NETWORK      = 'devnet'; // switch to 'mainnet-beta' for production
  const RPC_URL      = NETWORK === 'devnet'
    ? 'https://api.devnet.solana.com'
    : 'https://api.mainnet-beta.solana.com';

  // Pre-grinded "...neet" keypairs pool (add more via grind-neet.js)
  // These are PLACEHOLDER arrays — replace with real grinded keypairs
  const NEET_KEYPAIR_POOL = [
    // { publicKey: "...", secretKey: [...] },  // add grinded keypairs here
  ];

  // ─── Solana connection ────────────────────────────────────────────────────
  let _connection = null;
  function getConnection() {
    if (!_connection && window.solanaWeb3) {
      _connection = new window.solanaWeb3.Connection(RPC_URL, 'confirmed');
    }
    return _connection;
  }

  // ─── Bonding curve math (mirrors on-chain logic) ─────────────────────────
  const VIRTUAL_SOL = 30_000_000_000n;      // 30 SOL in lamports (BigInt)
  const VIRTUAL_TOK = 1_073_000_191_000_000n; // virtual token reserves
  const FEE_BPS     = 50n;                  // 0.5%

  window.NeetPad = {
    // Quote: how many tokens do you get for X lamports?
    quoteBuy(lamportsIn) {
      const lamports = BigInt(lamportsIn);
      const fee      = lamports * FEE_BPS / 10_000n;
      const netSol   = lamports - fee;
      // k = (vS + rS) * (vT + rT) — uses virtual reserves for fresh curve
      const k        = VIRTUAL_SOL * VIRTUAL_TOK;
      const newSol   = VIRTUAL_SOL + netSol;
      const newTok   = k / newSol;
      const tokOut   = VIRTUAL_TOK - newTok;
      return {
        tokensOut:  Number(tokOut) / 1e6,   // human-readable
        feeSOL:     Number(fee) / 1e9,
        pricePerTok: Number(netSol) / Number(tokOut) * 1e6,
      };
    },

    // Quote: how many lamports do you get for X tokens?
    quoteSell(tokensIn) {
      const tok    = BigInt(Math.floor(tokensIn * 1e6));
      const k      = VIRTUAL_SOL * VIRTUAL_TOK;
      const newTok = VIRTUAL_TOK + tok;
      const newSol = k / newTok;
      const solOut = VIRTUAL_SOL - newSol;
      const fee    = solOut * FEE_BPS / 10_000n;
      return {
        solOut:  Number(solOut - fee) / 1e9,
        feeSOL:  Number(fee) / 1e9,
      };
    },

    // Market cap at current state
    marketCap(realSolReserves) {
      const rS     = BigInt(realSolReserves);
      const k      = VIRTUAL_SOL * VIRTUAL_TOK;
      const curSol = VIRTUAL_SOL + rS;
      const curTok = k / curSol;
      const price  = Number(rS === 0n ? 0n : VIRTUAL_SOL) / Number(VIRTUAL_TOK) / 1e3;
      return price * 1_000_000_000; // total supply * price
    },

    // Progress to graduation (0–100%)
    graduationProgress(realSolReserves) {
      return Math.min(100, (realSolReserves / 69_000_000_000) * 100).toFixed(1);
    },

    // ── Get or pop a pre-grinded "...neet" keypair ─────────────────────────
    popNeetKeypair() {
      if (NEET_KEYPAIR_POOL.length === 0) {
        throw new Error('No pre-grinded keypairs available. Run: node scripts/grind-neet.js');
      }
      return NEET_KEYPAIR_POOL.pop();
    },

    // ── Launch a token ─────────────────────────────────────────────────────
    async launch({ name, symbol, description, imageUri, twitter, telegram, website }) {
      const provider = window.solana;
      if (!provider || !provider.isConnected) throw new Error('Connect your wallet first');

      const conn = getConnection();
      const mintKP = this.popNeetKeypair();  // grinded "...neet" keypair

      // Verify the CA ends in "neet"
      if (!mintKP.publicKey.toLowerCase().endsWith('neet')) {
        throw new Error('Keypair does not end in "neet"');
      }

      // Upload metadata to IPFS first
      const metaUri = imageUri || 'https://neetpad.xyz/default-token.png';

      // Build the IPFS metadata JSON
      const metadata = { name, symbol, description, image: metaUri,
        external_url: website || '', twitter, telegram };

      // For now, use a public IPFS pinning service via the browser
      // In production: use Pinata or NFT.Storage with an API key
      const ipfsUri = await this._pinToIPFS(metadata);

      // Create the on-chain transaction
      const tx = await this._buildCreateTokenTx(mintKP.publicKey, ipfsUri, name, symbol);

      // Sign with wallet + mint keypair
      const signedTx = await provider.signTransaction(tx);
      // Also sign with the mint keypair (the program needs it as mint authority initially)
      const mintKeypairFull = window.solanaWeb3.Keypair.fromSecretKey(
        Uint8Array.from(mintKP.secretKey)
      );
      signedTx.partialSign(mintKeypairFull);

      const sig = await conn.sendRawTransaction(signedTx.serialize());
      await conn.confirmTransaction(sig, 'confirmed');

      return { signature: sig, mintAddress: mintKP.publicKey, metaUri: ipfsUri };
    },

    // ── IPFS upload (uses nft.storage free API) ────────────────────────────
    async _pinToIPFS(metadata) {
      // Use NFT.Storage (free, no API key needed for small files)
      // Or replace with Pinata for production reliability
      try {
        const res = await fetch('https://api.nft.storage/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer YOUR_NFT_STORAGE_KEY' },
          body: JSON.stringify(metadata),
        });
        const data = await res.json();
        return `https://${data.value.cid}.ipfs.nftstorage.link/`;
      } catch {
        // Fallback: store metadata on-chain as base64 (not ideal but works for demo)
        return 'data:application/json;base64,' + btoa(JSON.stringify(metadata));
      }
    },

    // ── Build the create_token transaction ─────────────────────────────────
    async _buildCreateTokenTx(mintPubkey, uri, name, symbol) {
      // This would use Anchor's program client when IDL is available.
      // For now, returns a placeholder until the program is deployed.
      const conn = getConnection();
      const { blockhash } = await conn.getLatestBlockhash();

      // Placeholder — replace with actual Anchor instruction after deploy:
      // const program = new anchor.Program(IDL, PROGRAM_ID, provider);
      // return program.methods.createToken(name, symbol, uri).accounts({...}).transaction();
      const tx = new window.solanaWeb3.Transaction();
      tx.recentBlockhash = blockhash;
      tx.feePayer = window.solana.publicKey;
      return tx; // Will have real instructions after deploy
    },

    // ── Buy tokens ────────────────────────────────────────────────────────
    async buy(mintAddress, solAmount, slippagePct = 1) {
      const lamports = Math.floor(solAmount * 1e9);
      const quote    = this.quoteBuy(lamports);
      const minOut   = Math.floor(quote.tokensOut * 1e6 * (1 - slippagePct / 100));
      console.log(`Buying: ${quote.tokensOut.toFixed(2)} tokens for ${solAmount} SOL (fee: ${quote.feeSOL.toFixed(4)} SOL)`);
      // TODO: build + send buy instruction after deploy
    },

    // ── Sell tokens ───────────────────────────────────────────────────────
    async sell(mintAddress, tokenAmount, slippagePct = 1) {
      const quote  = this.quoteSell(tokenAmount);
      const minSol = Math.floor(quote.solOut * 1e9 * (1 - slippagePct / 100));
      console.log(`Selling: ${tokenAmount} tokens for ~${quote.solOut.toFixed(4)} SOL (fee: ${quote.feeSOL.toFixed(4)} SOL)`);
      // TODO: build + send sell instruction after deploy
    },
  };

  console.log('✅ NEET PAD client loaded. window.NeetPad ready.');
  console.log('   Program ID:', PROGRAM_ID);
  console.log('   Network:   ', NETWORK);
})();

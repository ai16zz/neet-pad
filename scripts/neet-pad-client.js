/**
 * NEET PAD — Anchor-Wired Frontend Client  v2.0
 * ─────────────────────────────────────────────
 * Requires (CDN):
 *   @solana/web3.js   -> window.solanaWeb3
 *   @coral-xyz/anchor -> window.anchor
 *
 * Usage:
 *   await NeetPad.init();
 *   const { mintAddress, sig } = await NeetPad.launch({ name, symbol, uri });
 *   await NeetPad.buy(mintAddress, 0.1);   // 0.1 SOL
 *   await NeetPad.sell(mintAddress, 1000); // 1000 tokens
 */

(function () {
  'use strict';

  // IDL (mirrors Anchor 0.32.1 generated output from programs/neet-pad/src/lib.rs)
  const IDL = {
    version: "0.1.0",
    name: "neet_pad",
    instructions: [
      {
        name: "initialize",
        accounts: [
          { name: "platformState", isMut: true,  isSigner: false },
          { name: "authority",     isMut: true,  isSigner: true  },
          { name: "systemProgram", isMut: false, isSigner: false }
        ],
        args: [
          { name: "treasury", type: "publicKey" },
          { name: "neetMint", type: "publicKey" }
        ]
      },
      {
        name: "createToken",
        accounts: [
          { name: "creator",                isMut: true,  isSigner: true  },
          { name: "mint",                   isMut: true,  isSigner: true  },
          { name: "bondingCurve",           isMut: true,  isSigner: false },
          { name: "curveTokenVault",        isMut: true,  isSigner: false },
          { name: "curveSolVault",          isMut: true,  isSigner: false },
          { name: "treasury",               isMut: true,  isSigner: false },
          { name: "creatorNeetAta",         isMut: true,  isSigner: false },
          { name: "treasuryNeetAta",        isMut: true,  isSigner: false },
          { name: "platformState",          isMut: false, isSigner: false },
          { name: "tokenProgram",           isMut: false, isSigner: false },
          { name: "associatedTokenProgram", isMut: false, isSigner: false },
          { name: "systemProgram",          isMut: false, isSigner: false },
          { name: "rent",                   isMut: false, isSigner: false }
        ],
        args: [
          { name: "name",   type: "string" },
          { name: "symbol", type: "string" },
          { name: "uri",    type: "string" }
        ]
      },
      {
        name: "buy",
        accounts: [
          { name: "buyer",                  isMut: true,  isSigner: true  },
          { name: "mint",                   isMut: false, isSigner: false },
          { name: "bondingCurve",           isMut: true,  isSigner: false },
          { name: "curveTokenVault",        isMut: true,  isSigner: false },
          { name: "curveSolVault",          isMut: true,  isSigner: false },
          { name: "buyerTokenAta",          isMut: true,  isSigner: false },
          { name: "treasury",               isMut: true,  isSigner: false },
          { name: "tokenProgram",           isMut: false, isSigner: false },
          { name: "associatedTokenProgram", isMut: false, isSigner: false },
          { name: "systemProgram",          isMut: false, isSigner: false }
        ],
        args: [
          { name: "solIn",        type: "u64" },
          { name: "minTokensOut", type: "u64" }
        ]
      },
      {
        name: "sell",
        accounts: [
          { name: "seller",          isMut: true,  isSigner: true  },
          { name: "mint",            isMut: false, isSigner: false },
          { name: "bondingCurve",    isMut: true,  isSigner: false },
          { name: "curveTokenVault", isMut: true,  isSigner: false },
          { name: "curveSolVault",   isMut: true,  isSigner: false },
          { name: "sellerTokenAta",  isMut: true,  isSigner: false },
          { name: "treasury",        isMut: true,  isSigner: false },
          { name: "tokenProgram",    isMut: false, isSigner: false },
          { name: "systemProgram",   isMut: false, isSigner: false }
        ],
        args: [
          { name: "tokIn",     type: "u64" },
          { name: "minSolOut", type: "u64" }
        ]
      },
      {
        name: "graduate",
        accounts: [
          { name: "bondingCurve",  isMut: true,  isSigner: false },
          { name: "mint",          isMut: false, isSigner: false },
          { name: "curveSolVault", isMut: true,  isSigner: false },
          { name: "treasury",      isMut: true,  isSigner: false },
          { name: "systemProgram", isMut: false, isSigner: false }
        ],
        args: []
      }
    ],
    accounts: [
      {
        name: "PlatformState",
        type: {
          kind: "struct",
          fields: [
            { name: "authority",   type: "publicKey" },
            { name: "treasury",    type: "publicKey" },
            { name: "neetMint",    type: "publicKey" },
            { name: "totalRaised", type: "u64" },
            { name: "bump",        type: "u8" }
          ]
        }
      },
      {
        name: "BondingCurve",
        type: {
          kind: "struct",
          fields: [
            { name: "creator",            type: "publicKey" },
            { name: "mint",               type: "publicKey" },
            { name: "virtualSolReserves", type: "u64" },
            { name: "virtualTokReserves", type: "u64" },
            { name: "realSolReserves",    type: "u64" },
            { name: "realTokReserves",    type: "u64" },
            { name: "totalSupply",        type: "u64" },
            { name: "graduated",          type: "bool" },
            { name: "bump",               type: "u8" }
          ]
        }
      }
    ],
    events: [
      {
        name: "TokenCreated",
        fields: [
          { name: "mint",    type: "publicKey", index: false },
          { name: "creator", type: "publicKey", index: false },
          { name: "name",    type: "string",    index: false },
          { name: "symbol",  type: "string",    index: false },
          { name: "uri",     type: "string",    index: false }
        ]
      },
      {
        name: "Trade",
        fields: [
          { name: "mint",            type: "publicKey", index: false },
          { name: "user",            type: "publicKey", index: false },
          { name: "isBuy",           type: "bool",      index: false },
          { name: "solAmount",       type: "u64",       index: false },
          { name: "tokenAmount",     type: "u64",       index: false },
          { name: "realSolReserves", type: "u64",       index: false }
        ]
      },
      {
        name: "Graduated",
        fields: [
          { name: "mint",    type: "publicKey", index: false },
          { name: "realSol", type: "u64",       index: false }
        ]
      }
    ],
    errors: [
      { code: 6000, name: "NameTooLong",           msg: "Name must be <= 32 chars" },
      { code: 6001, name: "SymbolTooLong",         msg: "Symbol must be <= 10 chars" },
      { code: 6002, name: "UriTooLong",            msg: "URI must be <= 200 chars" },
      { code: 6003, name: "AlreadyGraduated",      msg: "Token has already graduated" },
      { code: 6004, name: "NotReadyToGraduate",    msg: "Token not ready to graduate" },
      { code: 6005, name: "ZeroAmount",            msg: "Amount must be > 0" },
      { code: 6006, name: "SlippageExceeded",      msg: "Slippage tolerance exceeded" },
      { code: 6007, name: "InsufficientLiquidity", msg: "Insufficient curve liquidity" },
      { code: 6008, name: "MathOverflow",          msg: "Math overflow" }
    ]
  };

  // Bonding curve constants (mirrors on-chain)
  const VIRTUAL_SOL    = 30_000_000_000n;
  const VIRTUAL_TOK    = 1_073_000_191_000_000n;
  const FEE_BPS        = 50n;
  const TOK_DECIMALS   = 6;
  const GRADUATION_SOL = 69_000_000_000n;

  const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
  const ATA_PROGRAM_ID   = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bLe';

  // Pre-grinded "...neet" keypairs — add via grind-neet.js or NeetPad.addNeetKeypair()
  const NEET_KEYPAIR_POOL = [];

  let _cfg        = { programId: null, network: 'devnet' };
  let _connection = null;
  let _provider   = null;
  let _program    = null;

  const w3     = () => window.solanaWeb3;
  const anc    = () => window.anchor;
  const pk     = s  => new (w3().PublicKey)(s);
  const BN     = n  => new (anc().BN)(String(n));
  const assert = () => { if (!_program) throw new Error('Call NeetPad.init() first'); };

  async function loadProgramId() {
    for (const p of ['/frontend/src/idl/deployment.json', '/idl/deployment.json']) {
      try { const r = await fetch(p); if (r.ok) { const d = await r.json(); if (d.programId) return d.programId; } } catch {}
    }
    if (_cfg.programId) return _cfg.programId;
    throw new Error('Program ID not found — deploy first or set NeetPad.config.programId');
  }

  const findPDA = async (seeds) => (await w3().PublicKey.findProgramAddress(seeds, pk(_cfg.programId)))[0];
  const bondingCurvePDA = m => findPDA([Buffer.from('bonding_curve'), m.toBuffer()]);
  const solVaultPDA     = m => findPDA([Buffer.from('sol_vault'), m.toBuffer()]);
  const platformPDA     = ()  => findPDA([Buffer.from('platform')]);

  function getATA(owner, mint) {
    return w3().PublicKey.findProgramAddressSync(
      [owner.toBuffer(), pk(TOKEN_PROGRAM_ID).toBuffer(), mint.toBuffer()],
      pk(ATA_PROGRAM_ID)
    )[0];
  }

  window.NeetPad = {
    config: _cfg,

    async init() {
      const wallet = window.solana;
      if (!wallet?.publicKey) throw new Error('Connect wallet first');
      _cfg.programId = _cfg.programId || await loadProgramId();
      _connection = new (w3().Connection)(
        _cfg.network === 'mainnet-beta' ? 'https://api.mainnet-beta.solana.com' : 'https://api.devnet.solana.com',
        'confirmed'
      );
      const wa = {
        publicKey: wallet.publicKey,
        signTransaction:     tx  => wallet.signTransaction(tx),
        signAllTransactions: txs => wallet.signAllTransactions(txs),
      };
      _provider = new anc().AnchorProvider(_connection, wa, { commitment: 'confirmed' });
      anc().setProvider(_provider);
      _program = new anc().Program(IDL, pk(_cfg.programId), _provider);
      console.log('[NeetPad] ready | program:', _cfg.programId, '| network:', _cfg.network);
      return this;
    },

    // ── Bonding curve math ──────────────────────────────────────────────────

    quoteBuy(lamports) {
      const lam = BigInt(lamports), fee = lam * FEE_BPS / 10_000n, net = lam - fee;
      const k = VIRTUAL_SOL * VIRTUAL_TOK, newS = VIRTUAL_SOL + net, newT = k / newS;
      const out = VIRTUAL_TOK - newT;
      return { tokensOut: Number(out) / 1e6, tokensOutRaw: out, feeLamports: fee, feeSOL: Number(fee) / 1e9 };
    },

    quoteSell(tokens) {
      const tok = BigInt(Math.floor(tokens * 1e6));
      const k = VIRTUAL_SOL * VIRTUAL_TOK, newT = VIRTUAL_TOK + tok, newS = k / newT;
      const out = VIRTUAL_SOL - newS, fee = out * FEE_BPS / 10_000n;
      return { solOut: Number(out - fee) / 1e9, solOutRaw: out - fee, feeLamports: fee, feeSOL: Number(fee) / 1e9 };
    },

    graduationProgress: (rS) => Math.min(100, Number(BigInt(rS) * 10000n / GRADUATION_SOL) / 100),

    // ── Keypair pool ────────────────────────────────────────────────────────

    addNeetKeypair(pubkey, secretKey) {
      if (!pubkey.toLowerCase().endsWith('neet')) throw new Error('Key must end in "neet"');
      NEET_KEYPAIR_POOL.push({ publicKey: pubkey, secretKey });
    },
    popNeetKeypair() {
      if (!NEET_KEYPAIR_POOL.length) throw new Error('Pool empty — run: node scripts/grind-neet.js --threads 8');
      return NEET_KEYPAIR_POOL.pop();
    },
    poolSize: () => NEET_KEYPAIR_POOL.length,

    // ── IPFS upload ─────────────────────────────────────────────────────────

    async pinToIPFS(meta, apiKey) {
      const key = apiKey || window.PINATA_KEY;
      if (key) {
        const r = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
          body: JSON.stringify({ pinataContent: meta, pinataMetadata: { name: meta.name } }),
        });
        if (!r.ok) throw new Error('Pinata failed: ' + await r.text());
        const d = await r.json();
        return 'https://gateway.pinata.cloud/ipfs/' + d.IpfsHash;
      }
      if (window.NFTSTORAGE_KEY) {
        try {
          const form = new FormData();
          form.append('file', new Blob([JSON.stringify(meta)], { type: 'application/json' }), 'meta.json');
          const r = await fetch('https://api.nft.storage/upload', {
            method: 'POST', headers: { Authorization: 'Bearer ' + window.NFTSTORAGE_KEY }, body: form,
          });
          const d = await r.json();
          return 'https://' + d.value.cid + '.ipfs.nftstorage.link/';
        } catch (e) { console.warn('[NeetPad] NFT.Storage failed:', e); }
      }
      // Base64 data URI fallback (demo only)
      console.warn('[NeetPad] No IPFS key — using base64 URI');
      return 'data:application/json;base64,' + btoa(unescape(encodeURIComponent(JSON.stringify(meta))));
    },

    // ── Launch ──────────────────────────────────────────────────────────────

    async launch({ name, symbol, description = '', imageUri, twitter = '', telegram = '', website = '', pinataKey } = {}) {
      assert();
      const kpData     = this.popNeetKeypair();
      const mintKP     = w3().Keypair.fromSecretKey(Uint8Array.from(kpData.secretKey));
      const mintPk     = mintKP.publicKey;
      if (!mintPk.toBase58().toLowerCase().endsWith('neet'))
        throw new Error('Keypair does not end in "neet": ' + mintPk.toBase58());

      const meta    = { name, symbol, description, image: imageUri || 'https://neetpad.xyz/default.png',
                        external_url: website, properties: { links: { twitter, telegram } } };
      const metaUri = await this.pinToIPFS(meta, pinataKey);

      const curvePDA = await bondingCurvePDA(mintPk);
      const vaultPDA = await solVaultPDA(mintPk);
      const platPDA  = await platformPDA();
      const platInfo = await _program.account.platformState.fetch(platPDA);
      const treasury = platInfo.treasury;
      const neetMint = platInfo.neetMint;

      const sig = await _program.methods.createToken(name, symbol, metaUri)
        .accounts({
          creator: _provider.wallet.publicKey, mint: mintPk,
          bondingCurve: curvePDA, curveTokenVault: getATA(curvePDA, mintPk),
          curveSolVault: vaultPDA, treasury,
          creatorNeetAta: getATA(_provider.wallet.publicKey, neetMint),
          treasuryNeetAta: getATA(treasury, neetMint),
          platformState: platPDA,
          tokenProgram: pk(TOKEN_PROGRAM_ID), associatedTokenProgram: pk(ATA_PROGRAM_ID),
          systemProgram: w3().SystemProgram.programId, rent: w3().SYSVAR_RENT_PUBKEY,
        })
        .signers([mintKP]).rpc();

      await _connection.confirmTransaction(sig, 'confirmed');
      console.log('[NeetPad] launched', mintPk.toBase58());
      return { signature: sig, mintAddress: mintPk.toBase58(), metaUri, bondingCurve: curvePDA.toBase58() };
    },

    // ── Buy ─────────────────────────────────────────────────────────────────

    async buy(mintAddress, solAmount, slippagePct = 1) {
      assert();
      const mintPk  = pk(mintAddress);
      const lam     = BigInt(Math.floor(solAmount * 1e9));
      const q       = this.quoteBuy(Number(lam));
      const minOut  = q.tokensOutRaw * BigInt(10000 - Math.floor(slippagePct * 100)) / 10000n;
      const curvePDA = await bondingCurvePDA(mintPk);
      const platInfo = await _program.account.platformState.fetch(await platformPDA());

      const sig = await _program.methods.buy(BN(lam), BN(minOut))
        .accounts({
          buyer: _provider.wallet.publicKey, mint: mintPk,
          bondingCurve: curvePDA, curveTokenVault: getATA(curvePDA, mintPk),
          curveSolVault: await solVaultPDA(mintPk),
          buyerTokenAta: getATA(_provider.wallet.publicKey, mintPk),
          treasury: platInfo.treasury,
          tokenProgram: pk(TOKEN_PROGRAM_ID), associatedTokenProgram: pk(ATA_PROGRAM_ID),
          systemProgram: w3().SystemProgram.programId,
        }).rpc();

      await _connection.confirmTransaction(sig, 'confirmed');
      console.log('[NeetPad] bought', q.tokensOut.toFixed(2), 'tokens | sig:', sig);
      return { signature: sig, tokensOut: q.tokensOut, feeSOL: q.feeSOL };
    },

    // ── Sell ────────────────────────────────────────────────────────────────

    async sell(mintAddress, tokenAmount, slippagePct = 1) {
      assert();
      const mintPk  = pk(mintAddress);
      const tokRaw  = BigInt(Math.floor(tokenAmount * 1e6));
      const q       = this.quoteSell(tokenAmount);
      const minSol  = q.solOutRaw * BigInt(10000 - Math.floor(slippagePct * 100)) / 10000n;
      const curvePDA = await bondingCurvePDA(mintPk);
      const platInfo = await _program.account.platformState.fetch(await platformPDA());

      const sig = await _program.methods.sell(BN(tokRaw), BN(minSol))
        .accounts({
          seller: _provider.wallet.publicKey, mint: mintPk,
          bondingCurve: curvePDA, curveTokenVault: getATA(curvePDA, mintPk),
          curveSolVault: await solVaultPDA(mintPk),
          sellerTokenAta: getATA(_provider.wallet.publicKey, mintPk),
          treasury: platInfo.treasury,
          tokenProgram: pk(TOKEN_PROGRAM_ID), systemProgram: w3().SystemProgram.programId,
        }).rpc();

      await _connection.confirmTransaction(sig, 'confirmed');
      console.log('[NeetPad] sold', tokenAmount, 'tokens for', q.solOut.toFixed(4), 'SOL | sig:', sig);
      return { signature: sig, solOut: q.solOut, feeSOL: q.feeSOL };
    },

    // ── Fetch state ─────────────────────────────────────────────────────────

    async getCurve(mintAddress) {
      assert();
      const mintPk = pk(mintAddress);
      const c  = await _program.account.bondingCurve.fetch(await bondingCurvePDA(mintPk));
      const vS = BigInt(c.virtualSolReserves.toString()), vT = BigInt(c.virtualTokReserves.toString());
      const rS = BigInt(c.realSolReserves.toString()),    rT = BigInt(c.realTokReserves.toString());
      const price = Number(vS + rS) / Number(vT + rT) * 1e6 / 1e9;
      return { ...c, price, marketCapSOL: price * 1e9, graduationProgress: this.graduationProgress(rS.toString()) };
    },

    async getPlatformState() { assert(); return _program.account.platformState.fetch(await platformPDA()); },

    // ── Graduate ────────────────────────────────────────────────────────────

    async graduate(mintAddress) {
      assert();
      const mintPk   = pk(mintAddress);
      const platInfo = await _program.account.platformState.fetch(await platformPDA());
      const sig = await _program.methods.graduate()
        .accounts({
          bondingCurve: await bondingCurvePDA(mintPk), mint: mintPk,
          curveSolVault: await solVaultPDA(mintPk), treasury: platInfo.treasury,
          systemProgram: w3().SystemProgram.programId,
        }).rpc();
      await _connection.confirmTransaction(sig, 'confirmed');
      return { signature: sig };
    },

    // ── Event listeners ─────────────────────────────────────────────────────

    onTokenCreated: h => { assert(); return _program.addEventListener('TokenCreated', h); },
    onTrade:        h => { assert(); return _program.addEventListener('Trade', h); },
    onGraduated:    h => { assert(); return _program.addEventListener('Graduated', h); },
    removeEventListener: id => { if (_program) _program.removeEventListener(id); },

    get program()    { return _program; },
    get connection() { return _connection; },
    IDL,
  };

  console.log('[NeetPad] client v2.0 loaded — call NeetPad.init() after wallet connect');
})();

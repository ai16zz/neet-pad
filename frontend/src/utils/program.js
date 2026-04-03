import * as anchor from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'

const PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_PROGRAM_ID || 'FAL3eAhkTv4twLCht4UFwSVdKtBp4Tg17yGwJFfjVfpp'
)
export const TREASURY = new PublicKey('H8tw1MkTKiqotp1hvR4Xna7Q4jt2t5yAvCru3UbrsJcb')

const IDL = {
  version: '0.1.0',
  name: 'neet_pad',
  instructions: [
    {
      name: 'createToken',
      accounts: [
        { name: 'platform', isMut: true, isSigner: false },
        { name: 'mint', isMut: true, isSigner: true },
        { name: 'bondingCurve', isMut: true, isSigner: false },
        { name: 'creator', isMut: true, isSigner: true },
        { name: 'systemProgram', isMut: false, isSigner: false },
        { name: 'tokenProgram', isMut: false, isSigner: false },
        { name: 'rent', isMut: false, isSigner: false },
      ],
      args: [
        { name: 'name', type: 'string' },
        { name: 'symbol', type: 'string' },
        { name: 'uri', type: 'string' },
      ],
    },
    {
      name: 'buy',
      accounts: [
        { name: 'bondingCurve', isMut: true, isSigner: false },
        { name: 'mint', isMut: true, isSigner: false },
        { name: 'buyer', isMut: true, isSigner: true },
        { name: 'buyerTokenAccount', isMut: true, isSigner: false },
        { name: 'treasury', isMut: true, isSigner: false },
        { name: 'tokenProgram', isMut: false, isSigner: false },
        { name: 'systemProgram', isMut: false, isSigner: false },
        { name: 'associatedTokenProgram', isMut: false, isSigner: false },
      ],
      args: [{ name: 'lamports', type: 'u64' }],
    },
    {
      name: 'sell',
      accounts: [
        { name: 'bondingCurve', isMut: true, isSigner: false },
        { name: 'mint', isMut: true, isSigner: false },
        { name: 'seller', isMut: true, isSigner: true },
        { name: 'sellerTokenAccount', isMut: true, isSigner: false },
        { name: 'treasury', isMut: true, isSigner: false },
        { name: 'tokenProgram', isMut: false, isSigner: false },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [{ name: 'tokens', type: 'u64' }],
    },
  ],
  accounts: [
    {
      name: 'BondingCurve',
      type: {
        kind: 'struct',
        fields: [
          { name: 'mint', type: 'publicKey' },
          { name: 'creator', type: 'publicKey' },
          { name: 'name', type: 'string' },
          { name: 'symbol', type: 'string' },
          { name: 'uri', type: 'string' },
          { name: 'tokensSold', type: 'u64' },
          { name: 'solRaised', type: 'u64' },
          { name: 'complete', type: 'bool' },
        ],
      },
    },
  ],
}

export function getProvider(connection, wallet) {
  return new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' })
}

export function getProgram(provider) {
  return new anchor.Program(IDL, PROGRAM_ID, provider)
}

export async function fetchBondingCurve(connection, mintStr) {
  try {
    const mint = new PublicKey(mintStr)
    const [curvePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('bonding_curve'), mint.toBuffer()],
      PROGRAM_ID
    )
    const provider = new anchor.AnchorProvider(connection, {}, { commitment: 'confirmed' })
    const program = new anchor.Program(IDL, PROGRAM_ID, provider)
    return await program.account.bondingCurve.fetch(curvePda)
  } catch {
    return null
  }
}

export async function fetchAllTokens(connection) {
  try {
    const provider = new anchor.AnchorProvider(connection, {}, { commitment: 'confirmed' })
    const program = new anchor.Program(IDL, PROGRAM_ID, provider)
    const curves = await program.account.bondingCurve.all()
    return curves.map(c => ({
      mint: c.account.mint.toBase58(),
      name: c.account.name,
      symbol: c.account.symbol,
      description: '',
      image: '',
      progress: (Number(c.account.tokensSold) / (800_000_000 * 1e6)) * 100,
    }))
  } catch {
    return []
  }
}

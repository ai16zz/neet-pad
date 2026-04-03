import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import * as anchor from '@coral-xyz/anchor'
import { fetchBondingCurve, getProgram, getProvider, TREASURY } from '../utils/program'
import { calcBuyOutput, calcSellOutput, progressPercent, currentPrice, marketCapSol } from '../utils/bondingCurve'

export default function TokenPage() {
  const { mint } = useParams()
  const { connection } = useConnection()
  const wallet = useWallet()
  const [curve, setCurve] = useState(null)
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState('buy')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (mint) fetchBondingCurve(connection, mint).then(setCurve)
  }, [connection, mint])

  const handleTrade = async () => {
    if (!wallet.connected) { setError('Connect wallet first'); return }
    setLoading(true)
    setError('')
    try {
      const provider = getProvider(connection, wallet)
      const program = getProgram(provider)
      const mintPk = new anchor.web3.PublicKey(mint)
      const lamports = parseFloat(amount) * anchor.web3.LAMPORTS_PER_SOL
      if (mode === 'buy') {
        await program.methods
          .buy(new anchor.BN(lamports))
          .accounts({ mint: mintPk, buyer: wallet.publicKey, treasury: TREASURY })
          .rpc()
      } else {
        const tokens = parseFloat(amount) * 1e6
        await program.methods
          .sell(new anchor.BN(tokens))
          .accounts({ mint: mintPk, seller: wallet.publicKey, treasury: TREASURY })
          .rpc()
      }
      fetchBondingCurve(connection, mint).then(setCurve)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!curve) return <div className="text-center py-16 text-gray-400">Loading...</div>

  const progress = progressPercent(curve)
  const price = currentPrice(curve)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">{curve.name}</h1>
      <p className="text-gray-400 text-sm mb-4">{curve.symbol}</p>

      <div className="bg-gray-800 rounded-xl p-4 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Progress to graduation</span>
          <span>{progress.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div className="bg-green-400 h-2 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span>Price: {price.toFixed(8)} SOL</span>
          <span>Market cap: {marketCapSol(curve).toFixed(2)} SOL</span>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-4">
        <div className="flex gap-2 mb-4">
          {['buy', 'sell'].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-lg font-medium capitalize ${mode === m ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              {m}
            </button>
          ))}
        </div>
        <input
          type="number"
          placeholder={mode === 'buy' ? 'SOL amount' : 'Token amount'}
          className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white mb-3 focus:outline-none"
          value={amount}
          onChange={e => setAmount(e.target.value)}
        />
        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
        <button
          onClick={handleTrade}
          disabled={loading || !amount}
          className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg font-medium capitalize"
        >
          {loading ? 'Processing...' : mode}
        </button>
      </div>
    </div>
  )
}

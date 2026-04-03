import { useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useNavigate } from 'react-router-dom'
import { getProgram, getProvider } from '../utils/program'
import { uploadToIPFS } from '../utils/pinata'
import * as anchor from '@coral-xyz/anchor'

export default function CreateToken() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', symbol: '', description: '', image: null })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!wallet.connected) { setError('Connect wallet first'); return }
    setLoading(true)
    setError('')
    try {
      let imageUri = ''
      if (form.image) {
        imageUri = await uploadToIPFS(form.image)
      }
      const meta = { name: form.name, symbol: form.symbol, description: form.description, image: imageUri }
      const metaUri = await uploadToIPFS(JSON.stringify(meta), 'application/json')

      const provider = getProvider(connection, wallet)
      const program = getProgram(provider)
      const mintKp = anchor.web3.Keypair.generate()
      await program.methods
        .createToken(form.name, form.symbol, metaUri)
        .accounts({ mint: mintKp.publicKey, creator: wallet.publicKey })
        .signers([mintKp])
        .rpc()
      navigate(`/token/${mintKp.publicKey.toBase58()}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Launch a Token</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Name</label>
          <input
            className="w-full bg-gray-800 rounded-lg px-4 py-2 text-white border border-gray-700 focus:outline-none focus:border-green-500"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Symbol</label>
          <input
            className="w-full bg-gray-800 rounded-lg px-4 py-2 text-white border border-gray-700 focus:outline-none focus:border-green-500"
            value={form.symbol}
            onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Description</label>
          <textarea
            className="w-full bg-gray-800 rounded-lg px-4 py-2 text-white border border-gray-700 focus:outline-none focus:border-green-500"
            rows={3}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Image</label>
          <input
            type="file"
            accept="image/*"
            className="w-full text-sm text-gray-400"
            onChange={e => setForm(f => ({ ...f, image: e.target.files[0] }))}
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg font-medium"
        >
          {loading ? 'Launching...' : 'Launch Token'}
        </button>
      </form>
    </div>
  )
}

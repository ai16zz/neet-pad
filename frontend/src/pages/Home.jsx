import { useEffect, useState } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import TokenCard from '../components/TokenCard'
import { fetchAllTokens } from '../utils/program'

export default function Home() {
  const { connection } = useConnection()
  const [tokens, setTokens] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllTokens(connection).then(setTokens).finally(() => setLoading(false))
  }, [connection])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Tokens</h1>
        <span className="text-gray-400 text-sm">{tokens.length} tokens</span>
      </div>
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading tokens...</div>
      ) : tokens.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No tokens yet</p>
          <p className="text-sm mt-2">Be the first to launch a token!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tokens.map(token => (
            <TokenCard key={token.mint} token={token} />
          ))}
        </div>
      )}
    </div>
  )
}

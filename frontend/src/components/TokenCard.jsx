import { Link } from 'react-router-dom'

export default function TokenCard({ token }) {
  const progress = token.progress || 0
  return (
    <Link to={`/token/${token.mint}`} className="block bg-gray-800 rounded-xl p-4 hover:bg-gray-700 transition">
      <div className="flex items-start gap-3">
        {token.image && (
          <img src={token.image} alt={token.name} className="w-12 h-12 rounded-lg object-cover" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white truncate">{token.name}</span>
            <span className="text-gray-400 text-sm">{token.symbol}</span>
          </div>
          <p className="text-gray-400 text-xs mt-1 truncate">{token.description}</p>
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Progress</span>
              <span>{progress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-green-400 h-1.5 rounded-full"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

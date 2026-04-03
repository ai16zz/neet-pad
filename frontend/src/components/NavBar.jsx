import { Link } from 'react-router-dom'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

export default function NavBar() {
  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800">
      <Link to="/" className="text-xl font-bold text-green-400">
        NEET PAD
      </Link>
      <div className="flex items-center gap-4">
        <Link to="/create" className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition">
          Launch Token
        </Link>
        <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-500" />
      </div>
    </nav>
  )
}

import { Link } from 'react-router-dom'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

export default function NavBar() {
  return (
    <nav style={{ background: '#050808', borderBottom: '1px solid #1a3322', padding: '0 16px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <Link to="/" style={{ color: '#00ff88', fontFamily: 'Courier New', fontWeight: 'bold', fontSize: '14px', letterSpacing: '0.15em', textDecoration: 'none' }}>
          $NEET <span style={{ color: '#447755' }}>PAD</span>
        </Link>
        <a href="https://ai16zz.github.io/neet/neet-predict_2.html"
           style={{ color: '#447755', fontSize: '10px', letterSpacing: '0.1em', textDecoration: 'none', textTransform: 'uppercase' }}>
          ← BACK TO $NEET
        </a>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Link to="/create" className="btn-green" style={{ padding: '8px 14px', fontSize: '10px', letterSpacing: '0.12em' }}>
          🚀 LAUNCH TOKEN
        </Link>
        <WalletMultiButton style={{
          background: 'transparent',
          border: '1px solid #1a3322',
          color: '#00ff88',
          fontFamily: 'Courier New',
          fontSize: '10px',
          letterSpacing: '0.1em',
          height: '34px',
          lineHeight: '34px',
          padding: '0 12px',
          borderRadius: '0',
        }} />
      </div>
    </nav>
  )
}

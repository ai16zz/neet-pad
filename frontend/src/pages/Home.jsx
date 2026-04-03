import { useEffect, useState } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { Link } from 'react-router-dom'
import { fetchAllTokens } from '../utils/program'
import TokenCard from '../components/TokenCard'

const STATS = [
  { label: 'TRADING FEE', value: '0.5%', sub: 'HALF OF PUMP.FUN' },
  { label: 'GRADUATION', value: '~$69K', sub: '1 SOL FEE VS 6 SOL' },
  { label: 'LAUNCH FEE', value: '0.02 SOL', sub: '+ 500 NEET 🔥 BURNED' },
  { label: 'VANITY CA', value: '...neet', sub: 'EVERY TOKEN' },
]

export default function Home() {
  const { connection } = useConnection()
  const [tokens, setTokens] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllTokens(connection).then(t => { setTokens(t); setLoading(false) })
  }, [connection])

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Hero */}
      <div style={{ borderBottom: '1px solid #1a3322', paddingBottom: '20px', marginBottom: '24px' }}>
        <div style={{ marginBottom: '4px', color: '#447755', fontSize: '10px', letterSpacing: '0.15em' }}>
          SOLANA · DEVNET BETA
        </div>
        <div style={{ color: '#00ff88', fontSize: '22px', fontWeight: 'bold', letterSpacing: '0.12em', marginBottom: '4px' }}>
          🚀 NEET PAD
        </div>
        <div style={{ color: '#447755', fontSize: '11px', letterSpacing: '0.1em' }}>
          LAUNCH YOUR TOKEN · UNIQUE TICKERS · EVERY CA ENDS IN ...neet
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '16px' }}>
          {STATS.map(s => (
            <div key={s.label} style={{ background: '#0a0f0a', border: '1px solid #1a3322', padding: '12px' }}>
              <div style={{ color: '#447755', fontSize: '9px', letterSpacing: '0.15em' }}>{s.label}</div>
              <div style={{ color: '#00ff88', fontSize: '18px', fontWeight: 'bold', margin: '4px 0 2px' }}>{s.value}</div>
              <div style={{ color: '#336644', fontSize: '9px', letterSpacing: '0.05em' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tokens */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ color: '#447755', fontSize: '10px', letterSpacing: '0.15em' }}>
          ALL TOKENS <span style={{ color: '#00ff88' }}>{tokens.length}</span>
        </div>
        <Link to="/create" className="btn-green" style={{ padding: '7px 14px', fontSize: '10px' }}>
          + LAUNCH TOKEN
        </Link>
      </div>

      {loading ? (
        <div style={{ color: '#447755', textAlign: 'center', padding: '48px', letterSpacing: '0.15em', fontSize: '11px' }}>
          LOADING TOKENS...
        </div>
      ) : tokens.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 20px', border: '1px dashed #1a3322' }}>
          <div style={{ color: '#447755', fontSize: '11px', letterSpacing: '0.15em', marginBottom: '20px' }}>
            NO TOKENS YET — BE THE FIRST TO LAUNCH
          </div>
          <Link to="/create" className="btn-green" style={{ padding: '12px 24px', fontSize: '12px' }}>
            🚀 LAUNCH FIRST TOKEN
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '10px' }}>
          {tokens.map(t => <TokenCard key={t.mint} token={t} />)}
        </div>
      )}
    </div>
  )
}

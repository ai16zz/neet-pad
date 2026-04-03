import { Link } from 'react-router-dom'

export default function TokenCard({ token }) {
  const progress = token.progress || 0
  return (
    <Link to={`/token/${token.mint}`} style={{ textDecoration: 'none' }}>
      <div
        style={{ background: '#0a0f0a', border: '1px solid #1a3322', padding: '12px', cursor: 'pointer', transition: 'border-color 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#00ff88'}
        onMouseLeave={e => e.currentTarget.style.borderColor = '#1a3322'}
      >
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          {token.image
            ? <img src={token.image} alt={token.name} style={{ width: '44px', height: '44px', objectFit: 'cover', border: '1px solid #1a3322', flexShrink: 0 }} />
            : <div style={{ width: '44px', height: '44px', background: '#050808', border: '1px solid #1a3322', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>🪙</div>
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ color: '#00ff88', fontWeight: 'bold', fontSize: '13px', letterSpacing: '0.05em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{token.name}</span>
              <span style={{ color: '#447755', fontSize: '10px', flexShrink: 0 }}>${token.symbol}</span>
            </div>
            {token.description && (
              <div style={{ color: '#336644', fontSize: '10px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{token.description}</div>
            )}
            <div style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', letterSpacing: '0.1em', marginBottom: '3px' }}>
                <span style={{ color: '#447755' }}>BONDING CURVE</span>
                <span style={{ color: progress > 66 ? '#00ff88' : progress > 33 ? '#00cc66' : '#447755' }}>{progress.toFixed(1)}%</span>
              </div>
              <div style={{ height: '2px', background: '#1a3322' }}>
                <div style={{ height: '100%', width: `${Math.min(progress, 100)}%`, background: '#00ff88', transition: 'width 0.3s' }} />
              </div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #0f1a12', display: 'flex', justifyContent: 'space-between', fontSize: '9px', letterSpacing: '0.1em' }}>
          <span style={{ color: '#336644' }}>...{token.mint?.slice(-8)}</span>
          <span style={{ color: '#447755' }}>VIEW →</span>
        </div>
      </div>
    </Link>
  )
}

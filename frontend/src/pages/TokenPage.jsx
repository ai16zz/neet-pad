import { useParams, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { fetchBondingCurve, getProgram, getProvider, TREASURY } from '../utils/program'
import { calcBuyOutput, calcSellOutput, progressPercent, currentPrice, marketCapSol } from '../utils/bondingCurve'
import * as anchor from '@coral-xyz/anchor'
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'

const S = {
  panel: { background: '#0a0f0a', border: '1px solid #1a3322', padding: '14px' },
  label: { color: '#447755', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase' },
  val: { color: '#00ff88', fontSize: '14px', fontWeight: 'bold', marginTop: '3px' },
}

export default function TokenPage() {
  const { mint } = useParams()
  const { connection } = useConnection()
  const wallet = useWallet()
  const [curve, setCurve] = useState(null)
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState('0.1')
  const [isBuy, setIsBuy] = useState(true)
  const [txLoading, setTxLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const refresh = () => fetchBondingCurve(connection, mint).then(c => {
    setCurve(c)
    setLoading(false)
    if (c?.uri) fetch(c.uri).then(r => r.json()).then(setMeta).catch(() => {})
  })

  useEffect(() => { refresh() }, [mint, connection])

  const handleTx = async () => {
    if (!wallet.connected) { setError('CONNECT WALLET FIRST'); return }
    setTxLoading(true); setError(''); setSuccess('')
    try {
      const provider = getProvider(connection, wallet)
      const program = getProgram(provider)
      const mintPk = new PublicKey(mint)
      const [curvePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('bonding_curve'), mintPk.toBuffer()],
        program.programId
      )
      if (isBuy) {
        const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL)
        await program.methods.buy(new anchor.BN(lamports))
          .accounts({ bondingCurve: curvePda, mint: mintPk, buyer: wallet.publicKey, treasury: TREASURY })
          .rpc()
        setSuccess('BUY ORDER EXECUTED ✓')
      } else {
        const tokens = Math.floor(parseFloat(amount) * 1e6)
        await program.methods.sell(new anchor.BN(tokens))
          .accounts({ bondingCurve: curvePda, mint: mintPk, seller: wallet.publicKey, treasury: TREASURY })
          .rpc()
        setSuccess('SELL ORDER EXECUTED ✓')
      }
      setTimeout(refresh, 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setTxLoading(false)
    }
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '80px', color: '#447755', letterSpacing: '0.15em', fontSize: '11px' }}>
      LOADING TOKEN DATA...
    </div>
  )
  if (!curve) return (
    <div style={{ textAlign: 'center', padding: '80px', color: '#ff3344', letterSpacing: '0.15em', fontSize: '11px' }}>
      TOKEN NOT FOUND · <Link to="/" style={{ color: '#447755' }}>← BACK</Link>
    </div>
  )

  const progress = progressPercent(curve)
  const price = currentPrice(curve)
  const mcap = marketCapSol(curve)
  const amtNum = parseFloat(amount) || 0
  const estOut = isBuy
    ? calcBuyOutput(curve, amtNum * LAMPORTS_PER_SOL).toLocaleString() + ' TOKENS'
    : (calcSellOutput(curve, amtNum * 1e6) / LAMPORTS_PER_SOL).toFixed(4) + ' SOL'

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Back */}
      <Link to="/" style={{ color: '#447755', fontSize: '10px', letterSpacing: '0.12em', textDecoration: 'none', display: 'block', marginBottom: '16px' }}>
        ← ALL TOKENS
      </Link>

      {/* Token Header */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #1a3322' }}>
        {meta?.image
          ? <img src={meta.image} alt={curve.name} style={{ width: '64px', height: '64px', objectFit: 'cover', border: '1px solid #1a3322', flexShrink: 0 }} />
          : <div style={{ width: '64px', height: '64px', background: '#0a0f0a', border: '1px solid #1a3322', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0 }}>🪙</div>
        }
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}>
            <span style={{ color: '#00ff88', fontSize: '20px', fontWeight: 'bold', letterSpacing: '0.1em' }}>{curve.name}</span>
            <span style={{ color: '#447755', fontSize: '14px' }}>${curve.symbol}</span>
          </div>
          {meta?.description && <div style={{ color: '#447755', fontSize: '11px', marginTop: '4px' }}>{meta.description}</div>}
          <div style={{ color: '#336644', fontSize: '9px', marginTop: '6px', letterSpacing: '0.05em', wordBreak: 'break-all' }}>
            CA: {mint}
          </div>
          {(meta?.twitter || meta?.telegram || meta?.website) && (
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
              {meta.twitter && <a href={meta.twitter} target="_blank" rel="noreferrer" style={{ color: '#447755', fontSize: '9px', letterSpacing: '0.12em', textDecoration: 'none' }}>TWITTER →</a>}
              {meta.telegram && <a href={meta.telegram} target="_blank" rel="noreferrer" style={{ color: '#447755', fontSize: '9px', letterSpacing: '0.12em', textDecoration: 'none' }}>TELEGRAM →</a>}
              {meta.website && <a href={meta.website} target="_blank" rel="noreferrer" style={{ color: '#447755', fontSize: '9px', letterSpacing: '0.12em', textDecoration: 'none' }}>WEBSITE →</a>}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>
        {/* Left */}
        <div>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
            {[
              { label: 'PRICE', value: `${(price * 1e6).toFixed(6)} SOL` },
              { label: 'MARKET CAP', value: `${mcap.toFixed(2)} SOL` },
              { label: 'PROGRESS', value: `${progress.toFixed(1)}%` },
            ].map(s => (
              <div key={s.label} style={S.panel}>
                <div style={S.label}>{s.label}</div>
                <div style={S.val}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Curve */}
          <div style={S.panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ color: '#447755', fontSize: '9px', letterSpacing: '0.15em' }}>BONDING CURVE PROGRESS</div>
              <div style={{ color: '#00ff88', fontSize: '9px', letterSpacing: '0.1em' }}>{progress.toFixed(1)}% TO GRADUATION</div>
            </div>
            <div style={{ height: '4px', background: '#1a3322' }}>
              <div style={{ height: '100%', width: `${Math.min(progress, 100)}%`, background: '#00ff88', transition: 'width 0.5s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '9px', color: '#336644', letterSpacing: '0.08em' }}>
              <span>0%</span>
              <span>GRADUATES TO RAYDIUM AT ~$69K · 1 SOL FEE</span>
              <span>100%</span>
            </div>
          </div>

          {curve.complete && (
            <div style={{ marginTop: '14px', padding: '12px', background: '#001a08', border: '1px solid #00ff88', color: '#00ff88', fontSize: '11px', letterSpacing: '0.15em', textAlign: 'center' }}>
              ✓ TOKEN GRADUATED · NOW TRADING ON RAYDIUM
            </div>
          )}
        </div>

        {/* Right: Trade */}
        <div style={S.panel}>
          <div style={{ color: '#00ff88', fontSize: '11px', letterSpacing: '0.15em', fontWeight: 'bold', marginBottom: '14px', paddingBottom: '8px', borderBottom: '1px solid #1a3322' }}>
            PLACE ORDER
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
            {['BUY', 'SELL'].map(side => (
              <button key={side} type="button" onClick={() => setIsBuy(side === 'BUY')}
                style={{
                  padding: '10px', fontSize: '11px', letterSpacing: '0.15em', fontFamily: 'Courier New',
                  fontWeight: 'bold', cursor: 'pointer', border: `1px solid ${side === 'BUY' ? '#00ff88' : '#ff3344'}`,
                  background: (isBuy && side === 'BUY') || (!isBuy && side === 'SELL')
                    ? (side === 'BUY' ? '#00ff88' : '#ff3344') : 'transparent',
                  color: (isBuy && side === 'BUY') || (!isBuy && side === 'SELL')
                    ? '#050808' : (side === 'BUY' ? '#00ff88' : '#ff3344'),
                }}>
                {side === 'BUY' ? '▲ BUY' : '▼ SELL'}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ color: '#447755', fontSize: '9px', letterSpacing: '0.15em', marginBottom: '5px' }}>
              {isBuy ? 'AMOUNT (SOL)' : 'AMOUNT (TOKENS)'}
            </div>
            <input type="number" min="0" step="0.1" value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ width: '100%', background: '#050808', border: '1px solid #1a3322', color: '#00ff88', fontFamily: 'Courier New', fontSize: '14px', padding: '9px 10px', letterSpacing: '0.05em' }} />
            <div style={{ display: 'flex', gap: '5px', marginTop: '7px', flexWrap: 'wrap' }}>
              {(isBuy ? ['0.05', '0.1', '0.25', '0.5', '1'] : ['1K', '10K', '100K']).map(v => (
                <button key={v} type="button" onClick={() => setAmount(v.replace('K', '000'))}
                  className="btn-outline" style={{ padding: '4px 8px' }}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '14px', fontSize: '10px', display: 'flex', flexDirection: 'column', gap: '5px', padding: '10px', background: '#050808', border: '1px solid #0f1a12' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#447755', letterSpacing: '0.1em' }}>0.5% FEE</span>
              <span style={{ color: '#336644' }}>{(amtNum * 0.005).toFixed(4)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#447755', letterSpacing: '0.1em' }}>EST. OUTPUT</span>
              <span style={{ color: '#00ff88' }}>{estOut}</span>
            </div>
          </div>

          {error && <div style={{ color: '#ff3344', fontSize: '10px', letterSpacing: '0.08em', marginBottom: '10px', padding: '8px', border: '1px solid #ff3344', background: '#1a0006' }}>⚠ {error}</div>}
          {success && <div style={{ color: '#00ff88', fontSize: '10px', letterSpacing: '0.1em', marginBottom: '10px', padding: '8px', border: '1px solid #00ff88', background: '#001a08' }}>{success}</div>}

          <button type="button" disabled={txLoading || !wallet.connected || curve.complete} onClick={handleTx}
            style={{
              width: '100%', padding: '13px', fontSize: '12px', letterSpacing: '0.15em',
              fontFamily: 'Courier New', fontWeight: 'bold', cursor: 'pointer', border: 'none',
              background: isBuy ? '#00ff88' : '#ff3344', color: '#050808',
              opacity: txLoading || !wallet.connected ? 0.5 : 1,
            }}>
            {!wallet.connected ? 'CONNECT WALLET'
              : txLoading ? 'PROCESSING...'
              : curve.complete ? 'TRADING ON RAYDIUM'
              : isBuy ? '▲ BUY' : '▼ SELL'}
          </button>
        </div>
      </div>
    </div>
  )
}

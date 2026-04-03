import { useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useNavigate } from 'react-router-dom'
import { getProgram, getProvider } from '../utils/program'
import { uploadToIPFS } from '../utils/pinata'
import * as anchor from '@coral-xyz/anchor'

const S = {
  panel: { background: '#0a0f0a', border: '1px solid #1a3322', padding: '16px', marginBottom: '14px' },
  sTitle: { color: '#00ff88', fontSize: '11px', letterSpacing: '0.15em', fontWeight: 'bold', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #1a3322' },
  label: { color: '#447755', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '5px' },
  input: { width: '100%', background: '#050808', border: '1px solid #1a3322', color: '#00ff88', fontFamily: 'Courier New', fontSize: '12px', letterSpacing: '0.05em', padding: '8px 10px' },
}

export default function CreateToken() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', symbol: '', description: '',
    image: null, imagePreview: null,
    twitter: '', telegram: '', website: '',
    initialBuy: '0.0',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleImage = e => {
    const file = e.target.files[0]
    if (!file) return
    set('image', file)
    const reader = new FileReader()
    reader.onload = ev => set('imagePreview', ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!wallet.connected) { setError('CONNECT WALLET FIRST'); return }
    setLoading(true); setError('')
    try {
      let imageUri = ''
      if (form.image) imageUri = await uploadToIPFS(form.image)
      const meta = {
        name: form.name, symbol: form.symbol, description: form.description,
        image: imageUri, twitter: form.twitter, telegram: form.telegram, website: form.website,
      }
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
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ color: '#00ff88', fontSize: '16px', fontWeight: 'bold', letterSpacing: '0.12em' }}>🚀 LAUNCH TOKEN</div>
        <div style={{ color: '#447755', fontSize: '10px', letterSpacing: '0.1em', marginTop: '4px' }}>
          0.02 SOL + 500 NEET 🔥 · VANITY CA ENDING IN ...neet · 0.5% TRADING FEE
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>
        {/* LEFT: Form */}
        <form onSubmit={handleSubmit}>
          {/* Token Details */}
          <div style={S.panel}>
            <div style={S.sTitle}>TOKEN DETAILS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={S.label}>TOKEN NAME</label>
                <input style={S.input} value={form.name} onChange={e => set('name', e.target.value)} placeholder="My Meme Token" required />
              </div>
              <div>
                <label style={S.label}>TICKER</label>
                <input style={S.input} value={form.symbol} onChange={e => set('symbol', e.target.value.toUpperCase())} placeholder="MEME" required maxLength={10} />
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={S.label}>DESCRIPTION</label>
              <textarea style={{ ...S.input, resize: 'vertical', minHeight: '68px' }}
                value={form.description} onChange={e => set('description', e.target.value)}
                placeholder="Tell the world about your token..." />
            </div>
            <div>
              <label style={S.label}>TOKEN IMAGE <span style={{ color: '#336644' }}>JPG / PNG / GIF · MAX 5MB</span></label>
              <label
                style={{ display: 'block', border: '1px dashed #1a3322', padding: '20px', textAlign: 'center', cursor: 'pointer', background: '#050808', transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#00ff88'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#1a3322'}
              >
                {form.imagePreview
                  ? <img src={form.imagePreview} alt="preview" style={{ maxHeight: '80px', maxWidth: '100%', margin: '0 auto', display: 'block' }} />
                  : <span style={{ color: '#447755', fontSize: '10px', letterSpacing: '0.12em' }}>DRAG & DROP OR CLICK TO UPLOAD</span>
                }
                <input type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          {/* Socials */}
          <div style={S.panel}>
            <div style={S.sTitle}>SOCIALS <span style={{ color: '#336644', fontSize: '10px', fontWeight: 'normal' }}>— OPTIONAL</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { k: 'twitter', label: 'TWITTER / X', ph: 'https://x.com/...' },
                { k: 'telegram', label: 'TELEGRAM', ph: 'https://t.me/...' },
                { k: 'website', label: 'WEBSITE', ph: 'https://...' },
              ].map(s => (
                <div key={s.k}>
                  <label style={S.label}>{s.label}</label>
                  <input style={S.input} value={form[s.k]} onChange={e => set(s.k, e.target.value)} placeholder={s.ph} />
                </div>
              ))}
            </div>
          </div>

          {/* Initial Buy */}
          <div style={S.panel}>
            <div style={S.sTitle}>INITIAL BUY <span style={{ color: '#336644', fontSize: '10px', fontWeight: 'normal' }}>— OPTIONAL</span></div>
            <div style={{ color: '#447755', fontSize: '10px', letterSpacing: '0.05em', marginBottom: '10px' }}>
              BE THE FIRST BUYER AT LAUNCH PRICE. FRONT-RUN THE MARKET.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type="number" style={{ ...S.input, width: '140px' }}
                value={form.initialBuy} onChange={e => set('initialBuy', e.target.value)}
                min="0" step="0.1" placeholder="0.0" />
              <span style={{ color: '#447755', fontSize: '12px', letterSpacing: '0.1em' }}>SOL</span>
            </div>
          </div>

          {error && (
            <div style={{ color: '#ff3344', fontSize: '10px', letterSpacing: '0.1em', padding: '10px', border: '1px solid #ff3344', background: '#1a0006', marginBottom: '14px' }}>
              ⚠ {error}
            </div>
          )}

          <button type="submit" disabled={loading || !wallet.connected} className="btn-green"
            style={{ width: '100%', padding: '14px', fontSize: '12px', letterSpacing: '0.15em' }}>
            {!wallet.connected ? 'CONNECT WALLET FIRST'
              : loading ? 'LAUNCHING...'
              : '🚀 LAUNCH TOKEN — 0.02 SOL + 500 NEET'}
          </button>
        </form>

        {/* RIGHT: Preview + Info */}
        <div>
          {/* Live Preview */}
          <div style={S.panel}>
            <div style={S.sTitle}>LIVE PREVIEW</div>
            <div style={{ border: '1px solid #1a3322', padding: '12px', background: '#050808' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                {form.imagePreview
                  ? <img src={form.imagePreview} style={{ width: '48px', height: '48px', objectFit: 'cover', border: '1px solid #1a3322' }} alt="" />
                  : <div style={{ width: '48px', height: '48px', background: '#0a0f0a', border: '1px solid #1a3322', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🪙</div>
                }
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#00ff88', fontWeight: 'bold', fontSize: '13px' }}>{form.name || 'TOKEN NAME'}</div>
                  <div style={{ color: '#447755', fontSize: '11px' }}>${form.symbol || 'TICKER'}</div>
                  <div style={{ color: '#336644', fontSize: '10px', marginTop: '3px' }}>{form.description || 'Your token description...'}</div>
                </div>
              </div>
              <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #0f1a12' }}>
                <div style={{ color: '#447755', fontSize: '9px', letterSpacing: '0.12em', marginBottom: '3px' }}>CONTRACT ADDRESS</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                  <span style={{ color: '#336644' }}>xxxxxxxxxxxxxxxxxxxxxxxx</span>
                  <span style={{ color: '#00ff88' }}>...neet</span>
                </div>
              </div>
            </div>
          </div>

          {/* Fee Comparison */}
          <div style={S.panel}>
            <div style={S.sTitle}>FEE COMPARISON</div>
            <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ color: '#447755', textAlign: 'left', padding: '4px 0', letterSpacing: '0.1em', fontWeight: 'normal' }}></th>
                  <th style={{ color: '#00ff88', textAlign: 'right', padding: '4px 8px', letterSpacing: '0.1em', fontWeight: 'bold' }}>NEET PAD</th>
                  <th style={{ color: '#447755', textAlign: 'right', padding: '4px 0', letterSpacing: '0.1em', fontWeight: 'normal' }}>PUMP.FUN</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['TRADING FEE', '0.5%', '1%'],
                  ['GRADUATION', '1 SOL', '6 SOL'],
                  ['LAUNCH FEE', '0.02 SOL', '0.02 SOL'],
                  ['UNIQUE TICKERS', '✓ ON-CHAIN', '✗ NONE'],
                  ['VANITY CA', '✓ ...neet', '✗ RANDOM'],
                ].map(([label, neet, pump]) => (
                  <tr key={label} style={{ borderTop: '1px solid #0f1a12' }}>
                    <td style={{ color: '#447755', padding: '5px 0', letterSpacing: '0.05em' }}>{label}</td>
                    <td style={{ color: '#00ff88', textAlign: 'right', padding: '5px 8px' }}>{neet}</td>
                    <td style={{ color: '#336644', textAlign: 'right', padding: '5px 0' }}>{pump}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bonding Curve */}
          <div style={S.panel}>
            <div style={S.sTitle}>BONDING CURVE</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
              {[
                { label: 'VIRTUAL SOL', value: '30 SOL' },
                { label: 'TOTAL SUPPLY', value: '1B' },
                { label: 'GRADUATION', value: '~$69K' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center', padding: '8px', background: '#050808', border: '1px solid #0f1a12' }}>
                  <div style={{ color: '#447755', fontSize: '8px', letterSpacing: '0.1em' }}>{s.label}</div>
                  <div style={{ color: '#00ff88', fontSize: '14px', fontWeight: 'bold', marginTop: '3px' }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div style={{ color: '#336644', fontSize: '9px', letterSpacing: '0.05em', lineHeight: '1.5' }}>
              TOKEN GRADUATES TO RAYDIUM WHEN MARKET CAP REACHES ~$69K.
              1 SOL GRADUATION FEE — VS 6 SOL ON PUMP.FUN.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

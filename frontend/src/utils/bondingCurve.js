// Pump.fun style bonding curve math
// Supply target: 800M tokens, SOL target: 85 SOL

const SUPPLY_TARGET = 800_000_000 * 1e6 // micro-tokens
const SOL_TARGET = 85 * 1e9 // lamports

export function calcBuyOutput(curve, lamports) {
  const k = SUPPLY_TARGET / SOL_TARGET
  return Math.floor(lamports * k * 0.99) // 1% fee
}

export function calcSellOutput(curve, tokens) {
  const k = SOL_TARGET / SUPPLY_TARGET
  return Math.floor(tokens * k * 0.99) // 1% fee
}

export function progressPercent(curve) {
  if (!curve) return 0
  const tokensSold = Number(curve.tokensSold || 0)
  return Math.min((tokensSold / SUPPLY_TARGET) * 100, 100)
}

export function currentPrice(curve) {
  if (!curve) return 0
  const tokensSold = Number(curve.tokensSold || 0)
  const solRaised = Number(curve.solRaised || 0)
  if (tokensSold === 0) return SOL_TARGET / SUPPLY_TARGET / 1e3
  return solRaised / tokensSold
}

export function marketCapSol(curve) {
  if (!curve) return 0
  return Number(curve.solRaised || 0) / 1e9
}

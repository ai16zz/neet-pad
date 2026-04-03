const JWT = import.meta.env.VITE_PINATA_JWT
const GATEWAY = import.meta.env.VITE_PINATA_GATEWAY || 'gateway.pinata.cloud'

export async function uploadToIPFS(data, contentType = 'image/*') {
  if (!JWT) throw new Error('VITE_PINATA_JWT not set')
  let blob
  if (data instanceof File || data instanceof Blob) {
    blob = data
  } else {
    blob = new Blob([data], { type: contentType })
  }
  const formData = new FormData()
  formData.append('file', blob, 'upload')
  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${JWT}` },
    body: formData,
  })
  if (!res.ok) throw new Error(`Pinata error: ${res.statusText}`)
  const json = await res.json()
  return `https://${GATEWAY}/ipfs/${json.IpfsHash}`
}

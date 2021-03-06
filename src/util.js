
// creates a 20-bit (digest) key from a public key)
const keyToId = async (publicKey) => {
  const spkiArrayBuffer = await window.crypto.subtle.exportKey('spki', publicKey)
  const shortSpki = await window.crypto.subtle.digest('SHA-1', spkiArrayBuffer)
  return Buffer.from(shortSpki)
}

const signatureHash = async (signature) => {
  const shortSignature = await window.crypto.subtle.digest('SHA-1', signature)
  return Buffer.from(shortSignature)
}

module.exports = { keyToId, signatureHash }

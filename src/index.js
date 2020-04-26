const PeerRelay = require('peer-relay')
const WebDHT = require('./WebDHT')
const _ = require('lodash')
const wrtc = require('electron-webrtc')
const crypto = window.crypto
const { getKeys } = require('./keystore')

const log = (message) => {
  const logLine = document.createElement('div')
  logLine.innerHTML = message
  document.getElementById('log').appendChild(logLine)
}

// creates a 20-bit (digest) key from a public key)
const keyToId = async (publicKey) => {
  const spkiArrayBuffer = await window.crypto.subtle.exportKey('spki', publicKey)
  const shortSpki = await window.crypto.subtle.digest('SHA-1', spkiArrayBuffer)
  return Buffer.from(shortSpki)
}

const startup = async () => {
  if (!crypto || !crypto.subtle) {
    log('Your browser does not support the necessary "SubtleCrypto" operations.')
    return
  }
  if (!window.indexedDB) {
    log('Your current browser does not support IndexedDB. This page will not work.')
    return
  }
  log('Retrieving cryptographic keys')
  const keys = await getKeys(log)
  _.forEach(keys, (key, name) => {
    log(`Retrieved ${name} key`)
  })
  const sign = keys.sign
  const encrypt = keys.encrypt
  log('Starting P2P network')
  const id = await keyToId(encrypt.publicKey)
  const dht = WebDHT.start({
    id,
    bootstrap: ['ws://localhost:8000']
  })
  log(`Local identifier: ${dht.nodeId.toString('hex')}`)
  dht.onmessage((doc, peerId) => {
    log(`${peerId.toString('hex')} says: ${JSON.stringify(doc)}`)
  })
  document.getElementById('submit').onclick = () => {
    const peerId = document.getElementById('peerId').value
    const peer = Buffer.from(peerId, 'hex')
    dht.sendMessage({ message: 'Hello!' }, peer, (e) => {
      if (e) console.log(e)
    })
  }
}

startup()

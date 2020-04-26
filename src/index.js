const PeerRelay = require('peer-relay')
const _ = require('lodash')
const crypto = window.crypto

/**
const config = {
  digest: 'SHA-256'
}
**/

const log = (message) => {
  const logLine = document.createElement('div')
  logLine.innerHTML = message
  document.getElementById('log').appendChild(logLine)
}

const startup = () => {
  if (!crypto || !crypto.subtle) {
    log('Your browser does not support the necessary "SubtleCrypto" operations.')
    return
  }
  const peer = new PeerRelay()
  log('Starting P2P network')
  log(_.join(['Local identifier:', peer.id.toString('hex')], ' '))
}

startup()

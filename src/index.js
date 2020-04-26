const WebDHT = require('./WebDHT')
const Protocol = require('./protocol')
const Ledger = require('./ledger')
const _ = require('lodash')
const crypto = window.crypto
const { getKeys } = require('./keystore')
const { keyToId } = require('./util')

require('debug').enable('manipona:*')

const log = require('debug')('manipona:main')
/**
const log = (message) => {
  const logLine = document.createElement('div')
  logLine.innerHTML = message
  document.getElementById('log').appendChild(logLine)
}
**/
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
  log('Starting P2P network')
  const id = await keyToId(keys.encrypt.publicKey)
  const dht = WebDHT.start({
    id,
    bootstrap: ['ws://localhost:8000'],
    update: (nodes) => {
      const selectPeer = document.getElementById('peerId')
      selectPeer.innerHTML = ''
      _.each(nodes, (node) => {
        const option = document.createElement('option')
        option.value = node.host
        option.innerHTML = node.host
        selectPeer.appendChild(option)
      })
    }
  })
  const ledger = await Ledger(keys, (lastTransfer) => {
    log(lastTransfer)
    document.getElementById('balance').innerHTML = lastTransfer.balance
  })

  Protocol.attach(dht, keys, ledger)
  document.getElementById('myId').innerHTML = dht.nodeId.toString('hex')
  dht.onmessage((doc, peerId) => {
    log(`${peerId.toString('hex')} says: ${JSON.stringify(doc)}`)
  })
  const commands = ['hello', 'signKey', 'encryptKey', 'transfer']
  _.each(commands, (command) => {
    document.getElementById(command).onclick = () => {
      const peerId = document.getElementById('peerId').value
      const msg = { command }
      if (!_.isEmpty(peerId)) {
        const peer = Buffer.from(peerId, 'hex')
        const amount = parseInt(document.getElementById('amount'))
        if (amount > 0) {
          msg.amount = amount
        }
        dht.sendMessage(msg, peer, (e) => {
          if (e) console.log(e)
        })
      }
    }
  })
}

startup()

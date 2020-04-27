const debug = require('debug')('manipona:protocol')
const _ = require('lodash')

const hex2buffer = (hex) => Buffer.from(hex, 'hex')
const buffer2hex = (buffer) => buffer.toString('hex')
/**
 * Attach basic mani pona protocol on top of DHT messaging protocol.
 **/

const Protocol = (dht, keys, ledger) => {
  const self = this
  self.ledger = ledger
  self.keys = keys
  // incoming commands
  const commands = {
    message: async (doc, peer) => {
      window.alert(`${peer} says ${doc.message}`)
    },
    hello: async (doc, peer) => {
      dht.sendMessage({ command: 'message', message: `Hello ${buffer2hex(peer)}` }, peer)
    },
    signKey: async (doc, peer) => {
      dht.sendMessage({ command: 'message', message: 'Here\'s my signature verification key', signatureKey: keys.sign.jwk }, peer)
    },
    encryptKey: async (doc, peer) => {
      dht.sendMessage({ encryptKey: keys.encrypt.jwk }, peer)
    },
    transfer: async (doc, peer) => {
      const confirmed = _.pick(doc, ['timestamp', 'balance', 'previous'])
      confirmed.amount = -doc.amount
      confirmed.peer = ledger.id.toString('hex')
      const reply = await ledger.signTransfer(confirmed)
      reply.command = 'confirmTransfer'
      dht.sendMessage(reply, peer)
      const lastTransfer = await self.ledger.lastTransfer()
      const local = _.pick(doc, ['timestamp'])
      local.amount = doc.amount
      local.balance = lastTransfer.balance + doc.amount
      local.previous = lastTransfer.tranferId
      local.command = 'matchTransfer'
      dht.sendMessage(local, peer)
    },
    matchTransfer: async (doc, peer) => {
      const match = _.pick(doc, ['timestamp', 'amount', 'balance', 'previous'])
      match.peer = ledger.id.toString('hex')
      const reply = await ledger.signTransfer(match)
      reply.command = 'confirmTransfer'
      dht.sendMessage(reply, peer)
    },
    confirmTransfer: async (doc, peer) => {
      debug('Received transfer confirmation')
      await self.ledger.addTransfer(doc)
    }
  }
  dht.onmessage((doc, peer) => {
    if (!doc.command) {
      debug('Command not present')
      return
    }
    const command = commands[doc.command]
    if (!command) {
      debug(`Unkown command: ${command}`)
    } else {
      command(doc, peer).then(() => debug(`${doc.command} completed`)).catch((e) => debug(e))
    }
  })
  // outgoing commands
  self.sendCommand = async (msg, peer) => {
    if (msg.command === 'transfer') {
      const lastTransfer = await self.ledger.lastTransfer()
      msg.timestamp = new Date().getTime()
      msg.balance = lastTransfer.balance - msg.amount
      msg.previous = lastTransfer.transferId
    }
    dht.sendMessage(msg, peer, (e) => {
      if (e) console.log(e)
    })
  }
  return self
}

module.exports = Protocol



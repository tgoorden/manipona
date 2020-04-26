const debug = require('debug')

const hex2buffer = (hex) => Buffer.from(hex, 'hex')
const buffer2hex = (buffer) => buffer.toString('hex') 
/**
 * Attach basic mani pona protocol on top of DHT messaging protocol.
 **/
module.exports.attach = (dht, keys, ledger) => {
  const commands = {
    hello: (doc, peer) => {
      dht.sendMessage({ 'message': `Hello ${buffer2hex(peer)}` }, peer)
    },
    signKey: (doc, peer) => {
      dht.sendMessage({ signatureKey: keys.sign.jwk }, peer)
    },
    encryptKey: (doc, peer) => {
      dht.sendMessage({ encryptKey: keys.encrypt.jwk }, peer)
    },
    transfer: (doc, peer) => {
      const confirmation = {
        
      }
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
      command(doc, peer)
    }
  })
}



const _ = require('lodash')
const debug = require('debug')('ledger')
const { keyToId } = require('./util')
const dbName = 'manipona-ledger'
const objectStoreName = 'ledger'

const promisify = (request) => new Promise((resolve, reject) => {
  request.onsuccess = (e) => resolve(e.target.result)
  request.onerror = (e) => reject(e.error)
})

const Ledger = async (keys) => {
  const self = this
  self.keys = keys
  self.id = await keyToId(keys.encrypt.publicKey)
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const openDb = () => {
    var req = window.indexedDB.open(dbName, 1)
    // If the database is being created or upgraded to a new version,
    // see if the object store and its indexes need to be created.
    req.onupgradeneeded = function (e) {
      debug('Initializing ledger indexedDB')
      const db = e.target.result
      if (!db.objectStoreNames.contains(objectStoreName)) {
        var objStore = db.createObjectStore(objectStoreName, { autoIncrement: true })
        objStore.createIndex('peer', 'peer', { unique: false })
        objStore.createIndex('amount', 'amount', { unique: false })
      }
    }
    return promisify(req)
  }

  const objectStore = async (mode = 'readonly') => {
    const db = await openDb()
    const transaction = db.transaction([objectStoreName], mode)
    return transaction.objectStore(objectStoreName)
  }

  const signTransfer = async (transfer, key) => {
    const fieldsToSign = ['amount', 'peer', 'timestamp', 'balance', 'previous']
    _.pick(transfer, fieldsToSign)
    transfer.tosign = _.join(_.map(_.pick(transfer, fieldsToSign), (value, key) => `${key}:${value}`), ';')
    transfer.signature = await window.crypto.subtle.sign(key.algo, key.privateKey, encoder.encode(transfer.tosign))
    return transfer
  }

  self.init = async () => {
    let store = await objectStore('readonly')
    const count = await promisify(store.count())
    if (count === 0) {
      debug('Entering initial self-signed amount')
      let transfer = {
        amount: 100,
        peer: self.id.toString('hex'),
        timestamp: new Date().getTime(),
        balance: 100,
        previous: 'init' // this should be the signature of the previous transaction, but since this is the first one, we use a special value
      }
      transfer = await signTransfer(transfer, keys.sign)
      store = await objectStore('readwrite')
      await promisify(store.put(transfer))
    } else {
      debug('Ledger present and activated')
    }
    store.transaction.db.close()
  }

  await self.init()
  return self
}

module.exports = Ledger

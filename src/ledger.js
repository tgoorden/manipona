const _ = require('lodash')
const debug = require('debug')('manipona:ledger')
const { keyToId, signatureHash } = require('./util')
const dbName = 'manipona-ledger'
const objectStoreName = 'ledger'

const promisify = (request) => new Promise((resolve, reject) => {
  request.onsuccess = (e) => resolve(e.target.result)
  request.onerror = (e) => reject(e.error)
})

const promisifyCursor = (request) => new Promise((resolve, reject) => {
  request.onsuccess = (e) => {
    resolve(e.target.result.value)
  }
  request.onerror = (e) => reject(e.error)
})

const Ledger = async (keys, update = _.noop) => {
  const self = this
  self.keys = keys
  self.update = update
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
        objStore.createIndex('timestamp', 'timestamp', { unique: false })
        objStore.createIndex('transferId', 'transferId', { unique: true })
      }
    }
    return promisify(req)
  }

  const objectStore = async (mode = 'readonly') => {
    const db = await openDb()
    const transaction = db.transaction([objectStoreName], mode)
    return transaction.objectStore(objectStoreName)
  }

  self.signTransfer = async (transfer) => {
    const key = self.keys.sign
    const fieldsToSign = ['amount', 'peer', 'timestamp', 'balance', 'previous']
    const doc = _.pick(transfer, fieldsToSign)
    doc.tosign = _.join(_.map(_.pick(transfer, fieldsToSign), (value, key) => `${key}:${value}`), ';')
    const signature = await window.crypto.subtle.sign(key.algo, key.privateKey, encoder.encode(transfer.tosign))
    doc.transferId = (await signatureHash(signature)).toString('hex')
    return doc
  }

  self.addTransfer = async (transfer) => {
    const fields = ['amount', 'peer', 'timestamp', 'balance', 'previous', 'tosign', 'transferId']
    const doc = _.pick(transfer, fields)
    debug(doc)
    // checks and balances here!
    const store = await objectStore('readwrite')
    const last = await promisify(store.put(doc))
    self.update(last)
    return last
  }

  self.lastTransfer = async () => {
    const store = await objectStore('readonly')
    return promisifyCursor(store.openCursor(null, 'prev'))
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
      const doc = await self.signTransfer(transfer)
      store = await objectStore('readwrite')
      await promisify(store.put(doc))
    } else {
      debug('Ledger present and activated')
    }
    const last = await self.lastTransfer()
    self.update(last)
    store.transaction.db.close()
  }

  await self.init()
  return self
}

module.exports = Ledger

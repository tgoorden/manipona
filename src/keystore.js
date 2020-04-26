const _ = require('lodash')
const dbName = 'manipona'
const objectStoreName = 'keys'

const config = {
  encrypt: {
    params: {
      name: 'RSA-OAEP',
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    usage: ['encrypt', 'decrypt']
  },
  sign: {
    params: {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    usage: ['sign', 'verify']
  }
}

const openContext = (log) => new Promise((resolve, reject) => {
  var req = window.indexedDB.open(dbName, 1)
  req.onsuccess = function (e) {
    const context = {
      log: log,
      db: e.target.result
    }
    resolve(context)
  }
  req.onerror = function (e) {
    reject(e.error)
  }
  req.onblocked = function () {
    reject(new Error('Database already open'))
  }

  // If the database is being created or upgraded to a new version,
  // see if the object store and its indexes need to be created.
  req.onupgradeneeded = function (e) {
    log('Initializing indexedDB')
    const db = e.target.result
    if (!db.objectStoreNames.contains(objectStoreName)) {
      var objStore = db.createObjectStore(objectStoreName, { autoIncrement: true })
      objStore.createIndex('name', 'name', { unique: true })
      objStore.createIndex('jwk', 'jwk', { unique: false })
    }
  }
})

const getKey = (context, name) => new Promise((resolve, reject) => {
  const store = context.db.transaction([objectStoreName], 'readonly').objectStore(objectStoreName)
  const request = store.index('name').get(name)
  request.onsuccess = (e) => {
    resolve(e.target.result)
  }
  request.onerror = (e) => {
    reject(e.target.error)
  }
})

// generate and save keys
const createKey = (context, name) => new Promise((resolve, reject) => {
  window.crypto.subtle.generateKey(config[name].params, false, config[name].usage)
    .then((keyPair) => {
      window.crypto.subtle.exportKey('jwk', keyPair.publicKey)
        .then((jwk) => {
          const doc = {
            publicKey: keyPair.publicKey,
            privateKey: keyPair.privateKey,
            algo: config[name].params.name,
            name: name,
            jwk: jwk
          }
          const transaction = context.db.transaction([objectStoreName], 'readwrite')
          transaction.onerror = (e) => { reject(e.error) }
          transaction.onabort = (e) => { reject(e.error) }
          transaction.oncomplete = (e) => { resolve(doc) }
          const store = transaction.objectStore(objectStoreName)
          store.add(doc)
        })
    })
})

const retrieveKeys = async (context) => {
  const { log, db } = context
  const keys = {
    sign: await getKey(context, 'sign'),
    encrypt: await getKey(context, 'encrypt')
  }
  if (_.isEmpty(keys.sign) || _.isEmpty(keys.encrypt)) {
    log('No keys found, generating new keys.')
    keys.sign = await createKey(context, 'sign')
    keys.encrypt = await createKey(context, 'encrypt')
  } else {
    log('Pre-existing keys found and retrieved.')
  }
  db.close()
  return keys
}

const getKeys = async (log) => {
  return openContext(log)
    .then(retrieveKeys)
    .catch((error) => log(error.message))
}

exports.getKeys = getKeys

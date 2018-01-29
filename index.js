// Store and retrieve files locally or on an S3 bucket.
// Optionally encrypt contents before saving and decrypt on retrieval such that
// data is encrypted "at rest".

'use strict'

const fs = require('fs')
const pathTool = require('path')
const mkdirp = require('mkdirp')
const crypto = require('crypto-butter')

// Local FS
// --------

// path = `some/path/to/filename.ext`
const saveFileLocal = rootPath => (path, data) => new Promise((resolve, reject) => {
  const splitPath = path.split('/')
  const dirs = splitPath.slice(0, -1)
  const filename = splitPath[splitPath.length - 1]
  const combinedDir = `${ rootPath }/${ dirs.join('/') }`
  const fullPath = `${ combinedDir }/${ filename }`

  // TODO: convert `data` to a buffer, if it isn't already

  mkdirp(combinedDir, mkdirErr => {
    if (mkdirErr) reject(mkdirErr)

    // NOTE: assume `data` is a buffer
    fs.writeFile(fullPath, data, err => {
      if (err) reject(err)

      resolve(data)
    })
  })
})

const getFileLocal = rootPath => path => new Promise((resolve, reject) => {
  const fullPath = rootPath + path

  fs.readFile(fullPath, (err, data) => {
    if (err) reject(err)

    resolve(data)
  })
})

const removeFileLocal = rootPath => path => new Promise((resolve, reject) => {
  const fullPath = rootPath + path

  fs.unlink(fullPath, err => {
    if (err) reject(err)

    resolve(path)
  })
})


// AWS S3
// ------

// Ref: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property
const saveFileS3 = s3 => (path, data) => new Promise((resolve, reject) => {
  s3.putObject({
    Key: pathTool.basename(path),
    Body: data,
    ACL: 'private'
  }, (err, output) => {
    if (err) reject(err)

    resolve(output)
  })
})

// Ref: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getObject-property
const getFileS3 = s3 => path => new Promise((resolve, reject) => {
  s3.getObject({
    Key: pathTool.basename(path)
  }, (err, data) => {
    if (err) reject(err)

    resolve(data.Body)
  })
})

// Ref: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#deleteObject-property
const removeFileS3 = s3 => path => new Promise((resolve, reject) => {
  s3.deleteObject({
    Key: pathTool.basename(path)
  }, (err, data) => {
    if (err) reject(err)

    resolve()
  })
})


// Encrypt + Store
// ---------------

// data is expected to be passed as a buffer
const saveCryptoFile = (secret, salt) => saveFile => (path, data) => {
  return crypto.pbkdf(secret, salt)
    .then(key => crypto.encrypt_AES_CBC_HMAC(crypto.compress(data), key))
    .then(({ data, iv, mac }) => crypto.pack(data, iv, mac))
    .then(packedData => saveFile(path, packedData))
}

const getCryptoFile = (secret, salt) => getFile => path => {
  return getFile(path)
    .then(packedData => crypto.unpack(packedData))
    .then(({ data, iv, mac }) => {
      return crypto.pbkdf(secret, salt)
        .then(key => crypto.decrypt_AES_CBC_HMAC(data, key, iv, mac))
    })
    .then(decryptedData => crypto.decompress(decryptedData))
}


// Main Function
// -------------

const storage = ({
  rootPath = '/', // `/full/absolute/path/to/storage/location`
  crypto = {
    secret: '',
    salt: ''
  },
  type = 'local', // 'local', or 'S3'
  s3 = {
    bucket: '',
    region: '',
    accessKeyId: '',
    secretAccessKey: '',
    sslEnabled: true,
    signatureVersion: 'v4'
  }
}) => {
  switch (type) {
  case 's3':
    const AWS = require('aws-sdk')

    // AWS.config.update({
    //   accessKeyId: s3.accessKeyId,
    //   secretAccessKey: s3.secretAccessKey,
    //   sslEnabled: s3.sslEnabled,
    //   signatureVersion: s3.signatureVersion
    // })

    // Ref: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#constructor-property
    const s3obj = new AWS.S3({
      params: {
        Bucket: s3.bucket
      },
      accessKeyId: s3.accessKeyId,
      secretAccessKey: s3.secretAccessKey,
      sslEnabled: s3.sslEnabled,
      signatureVersion: s3.signatureVersion
    })

    return {
      saveFile: saveFileS3(s3obj),
      getFile: getFileS3(s3obj),
      removeFile: removeFileS3(s3obj),
      saveCryptoFile: saveCryptoFile(crypto.secret, crypto.salt)(saveFileS3(s3obj)),
      getCryptoFile: getCryptoFile(crypto.secret, crypto.salt)(getFileS3(s3obj))
    }
  case 'azure':
  case 'google':
  case 'dropbox':
  case 'local':
  default:
    return {
      saveFile: saveFileLocal(rootPath),
      getFile: getFileLocal(rootPath),
      removeFile: removeFileLocal(rootPath),
      saveCryptoFile: saveCryptoFile(crypto.secret, crypto.salt)(saveFileLocal(rootPath)),
      getCryptoFile: getCryptoFile(crypto.secret, crypto.salt)(getFileLocal(rootPath))
    }
  }
}

module.exports = storage

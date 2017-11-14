# Storage Broth

A tasty NodeJS broth to which you can add your own file storage ingredients.


## Install

`npm install storage-broth`


## Initialization

First, require the module and store it in a variable.

```javascript
const broth = require('storage-broth')
```

Then, create a new initialized instance with your config.

### Local File System

```javascript
const store =  broth({
  rootPath: '/my/root/path',
  type: 'local'
})
```

### AWS S3

```javascript
const store =  broth({
  rootPath: '/my/root/path',
  type: 's3',
  s3: {
    bucket: 'MyBucket',
    region: 'ca-central-1',
    accessKeyId: '12345',
    secretAccessKey: 'asdfg',
    sslEnabled: true
  }
})
```

### Crypto

The crypto functions can be used in conjunction with any storage type. These
values are required to be able to use `saveCryptoFile()` and `getCryptoFile()`.

Note that you can still call these functions without initializing them, but they
will have empty values for secret and salt, which is obviously not secure ;)

```javascript
const store =  broth({
  rootPath: '/my/root/path',
  crypto: {
    secret: 'my-super-secret-secret',
    salt: 'a-dash-of-salt'
  },
  type: 'local'
})
```


## Usage

### Plain

```javascript
const someData = 'something-you-want-to-store'
const relativePath = '/my-folder/filename'

store.saveFile(relativePath, someData)
  .then(path => store.getFile(relativePath))
  .then(data => store.removeFile(relativePath))
  .then(() => console.log('nothing to see here'))
```

### Crypto

```javascript
const someData = 'something-you-want-to-store'
const relativePath = '/my-folder/filename'

store.saveCryptoFile(relativePath, someData)
  .then(path => store.getCryptoFile(relativePath))
  .then(data => store.removeFile(relativePath))
  .then(() => console.log('nothing to see here'))
```


## License

[MIT](./LICENSE)


## Acknowledgements

- [mkdirp](https://github.com/substack/node-mkdirp)
- [crypto-butter](https://github.com/robmclarty/crypto-butter)
- [aws-sdk](https://github.com/aws/aws-sdk-js)

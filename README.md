docker-mysql-driver
=================

[![](https://img.shields.io/npm/v/docker-mysql-driver.svg?style=flat)](https://www.npmjs.com/package/docker-mysql-driver)

## Feature

- auto run mysql in docker
- reinitialize the environment at each start

## Usage

- docker pull mysql image (default: mysql:5.6)

### Getting start

```js
const dmd = require('docker-mysql-driver')

const mysqlServer = await dmd.start(options)

console.log(
  mysqlServer.port, // server port
  mysqlServer.rootPwd, // root password
  mysqlServer.database, // database name
)

mysqlServer.stop()
```

### Default Options

```js
{
  image: "mysql:5.6", // mysql docker image
  port: 0, // host port, 0 for random
  rootPwd: "123456", // root password
  reuse: true, // reuse container, container will not be delete if enabled
  name: 'mysql_test', // container name
  database: 'test_db', // database name
  dockerConfig: undefined, // you can see: https://github.com/apocas/dockerode
}
```

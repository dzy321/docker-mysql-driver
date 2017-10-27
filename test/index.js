const dmd = require('../dist');

(async function () {
  const mysqlServer = await dmd.start()
  console.log(mysqlServer.port, mysqlServer.rootPwd)
}())

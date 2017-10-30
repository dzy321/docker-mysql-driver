const dmd = require('../dist')
const test = require('ava')
const mysql = require('mysql2/promise')
const Promise = require('bluebird')

test('load not exist image', async (t) => {
  const error = await t.throws(dmd.start({ image: 'mysql:5.10000', name: 'xxxxx' }))
  t.is(error.message, '(HTTP code 404) no such container - No such image: mysql:5.10000 ')
})

test('test load success', async (t) => {
  const server = await dmd.start({ reuse: false, name: 'xxxxx' })
  try {
    t.true(typeof server.port === 'number')
    const conn = await mysql.createConnection({
      host: 'localhost',
      port: server.port,
      user: 'root',
      password: server.rootPwd,
      Promise,
    })
    const [rows, fields] = await conn.execute('select ?+1 as qqq, ? as rrr, ? as yyy', [1, null, 3])
    t.is(rows[0].qqq, 2)
    t.is(rows[0].rrr, null)
    t.is(rows[0].yyy, '3')
    t.deepEqual(fields.map(f => f.name), ['qqq', 'rrr', 'yyy'])
  } finally {
    await server.stop()
  }
})

test('test reuse', async (t) => {
  const opts = { name: 'xxxxxxxx', rootPwd: 'wtf123' }
  let server = await dmd.start(opts)
  if (server.isNew) {
    await server.stop()
    server = await dmd.start(opts)
  }
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      port: server.port,
      user: 'root',
      password: server.rootPwd,
      database: server.database,
      Promise,
    })
    const [rows, fields] = await conn.execute('show tables')
    t.is(rows.length, 0)
    t.deepEqual(fields.map(f => f.name), ['Tables_in_test_db'])
  } finally {
    await server.stop()
  }
})

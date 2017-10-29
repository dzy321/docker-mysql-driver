const Docker = require('dockerode')
const Promise = require('bluebird')
const log = require('./log')

const defaultOptions = {
  image: 'mysql:5.6',
  port: 0,
  rootPwd: '123456',
  reuse: true,
  name: 'mysql_test',
}

async function StreamToString(stream) {
  const chucks = []
  return new Promise((resolve, reject) => {
    stream.on('data', (data) => {
      chucks.push(data.toString())
    })
    stream.on('end', () => {
      resolve(chucks.join(''))
    })
    stream.on('error', (err) => {
      reject(err)
    })
  })
}

async function execCommand(container, cmds) {
  const exec = await container.exec({
    Cmd: cmds,
    AttachStdin: false,
    AttachStdout: true,
    AttachStderr: true,
  })
  const stream = await exec.start()
  container.modem.demuxStream(stream.output, process.stdout, process.stderr)
  const result = await StreamToString(stream.output)
  return result
}

function sleep(time) {
  return new Promise((resolve) => {
    setTimeout(resolve, time)
  })
}

async function tryMysql(container) {
  const result = await execCommand(container, ['mysql'])
  log.info(`try to connect mysql:${result}`)
  return result && result.indexOf('ERROR 2002') === -1
}

async function start(options) {
  const {
    dockerConfig,
    image,
    port,
    rootPwd,
    reuse,
    name,
  } = Object.assign({}, defaultOptions, options)

  const docker = new Docker({ Promise, ...dockerConfig })

  const containerInfos = await docker.listContainers({ all: true })

  const containerInfo = containerInfos.find(c => c.Names.indexOf(`/${name}`) > -1)

  let container = null

  let isOldContainer = false

  // if container is exist
  if (containerInfo) {
    const existContainerId = containerInfo.Id
    const existContainer = await docker.getContainer(existContainerId)
    const inspectInfo = await existContainer.inspect()
    const isRunning = inspectInfo.State.Running
    if (reuse) {
      if (!isRunning) {
        log.info('find exist container, restart it')
        await existContainer.start()
      }
      container = existContainer
      isOldContainer = true
    } else {
      if (isRunning) {
        await existContainer.kill()
      }
      await existContainer.remove()
    }
  }

  if (container === null) {
    const newContainer = await docker.createContainer({
      name,
      Image: image,
      Env: [
        `MYSQL_ROOT_PASSWORD=${rootPwd}`,
      ],
      ExposedPorts: {
        '3306/tcp': {},
      },
      HostConfig: {
        PortBindings: {
          '3306/tcp': [{
            HostPort: port || '0',
          }],
        },
      },
      Cmd: ['--character-set-server=utf8mb4', '--collation-server=utf8mb4_unicode_ci'],
    })
    await newContainer.start()
    log.info('start mysql container success')
    container = newContainer
  }
  const containerInspectInfo = await container.inspect()
  const hostPort = parseInt(containerInspectInfo.NetworkSettings.Ports['3306/tcp'][0].HostPort, 10)
  let isReady = false
  while (!isReady) {
    isReady = await tryMysql(container)
    if (!isReady) {
      await sleep(3000)
    }
  }
  log.info('mysql connect success')
  // if (isOldContainer) {

  // }
  process.on('beforeExit', async () => {
    if (container) {
      const inspectInfo = await container.inspect()
      if (inspectInfo.State.Running) {
        await container.kill()
      }
      if (!reuse) {
        await container.remove()
      }
    }
  })
  return { rootPwd, port: hostPort }
}

module.exports = {
  start,
}

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

  const containerInfo = containerInfos.find(c => c.Names.indexOf(name) > -1)

  let containerId = null
  let isOldContainer = false
  let hostPort

  // if container is exist
  if (containerInfo) {
    const existContainerId = containerInfo.Id
    const container = await docker.getContainer(existContainerId)
    const inspectInfo = await container.inspect()
    const isRunning = inspectInfo.State.Running
    if (reuse) {
      if (!isRunning) {
        log.info('find exist container, restart it')
        await container.start()
      }
      hostPort = parseInt(inspectInfo.NetworkSettings.Ports['3306/tcp'].HostPort, 10)
      containerId = existContainerId
      isOldContainer = true
    } else {
      if (isRunning) {
        await container.kill()
      }
      await container.remove()
    }
  }

  if (containerId === null) {
    const container = await docker.createContainer({
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
            HostPort: port || '1000-9000',
          }],
        },
      },
      Cmd: ['--character-set-server=utf8mb4', '--collation-server=utf8mb4_unicode_ci'],
    })
    containerId = container.Id
    container.start()
    log.info('start mysql container success')
    const inspectInfo = await container.inspect()
    hostPort = parseInt(inspectInfo.NetworkSettings.Ports['3306/tcp'].HostPort, 10)
  }
  return { rootPwd, port: hostPort }
}

module.exports = {
  start,
}

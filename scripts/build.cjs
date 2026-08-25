const { spawnSync } = require('node:child_process')

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const isOpenNextChildBuild = process.env.PICKAMGO_OPENNEXT_BUILD === '1'
const args = isOpenNextChildBuild
  ? ['next', 'build']
  : ['opennextjs-cloudflare', 'build']

const result = spawnSync(command, args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    PICKAMGO_OPENNEXT_BUILD: '1',
  },
})

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

process.exit(result.status ?? 1)

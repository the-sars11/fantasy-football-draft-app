const path = require('path')
const dir = path.resolve(__dirname)
process.chdir(dir)
const { spawn } = require('child_process')
const next = spawn(
  process.execPath,
  [path.join(dir, 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev', '-p', '3006'],
  { cwd: dir, stdio: 'inherit', env: { ...process.env } }
)
next.on('exit', (code) => process.exit(code))

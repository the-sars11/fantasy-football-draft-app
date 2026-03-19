const { execSync } = require('child_process')
const path = require('path')

const dir = path.resolve(__dirname)
process.chdir(dir)

const { createServer } = require(path.join(dir, 'node_modules', 'next', 'dist', 'server', 'lib', 'start-server.js'))

// Simple approach: just spawn the next dev process
const { spawn } = require('child_process')
const next = spawn(
  process.execPath,
  [path.join(dir, 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev', '-p', '3003'],
  { cwd: dir, stdio: 'inherit', env: { ...process.env } }
)

next.on('exit', (code) => process.exit(code))

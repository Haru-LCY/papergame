import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPaperApiMiddleware } from './server/paper-api.mjs'

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), 'dist')
const api = createPaperApiMiddleware()
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon' }

async function serveStatic(req, res) {
  const pathname = decodeURIComponent((req.url || '/').split('?')[0])
  const requested = normalize(join(root, pathname === '/' ? 'index.html' : pathname))
  const safe = requested === root || requested.startsWith(`${root}/`)
  let file = safe ? requested : join(root, 'index.html')
  try { if (!(await stat(file)).isFile()) throw new Error('not a file') } catch { file = join(root, 'index.html') }
  res.statusCode = 200
  res.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream')
  createReadStream(file).on('error', () => { res.statusCode = 500; res.end('Unable to read file') }).pipe(res)
}

const server = createServer((req, res) => {
  api(req, res, () => {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; return res.end('Method Not Allowed') }
    return serveStatic(req, res)
  }).catch((error) => { res.statusCode = 500; res.end(error?.message || 'Server error') })
})
const port = Number(process.env.PORT || 4173)
server.listen(port, '127.0.0.1', () => console.log(`Paper2 Ace Attorney running at http://127.0.0.1:${port}`))

// Downloads every dish photo in src/data/photos.json into public/food/<slug>.jpg,
// so the app works offline and doesn't depend on the Unsplash CDN.
// Usage: npm run photos   (re-run safely; existing files are skipped unless --force)
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const photos = JSON.parse(await readFile(join(root, 'src/data/photos.json'), 'utf8'))
const outDir = join(root, 'public/food')
const force = process.argv.includes('--force')
await mkdir(outDir, { recursive: true })

let failed = 0
for (const [slug, p] of Object.entries(photos)) {
  if (slug.startsWith('_')) continue
  const file = join(outDir, `${slug}.jpg`)
  if (existsSync(file) && !force) {
    console.log(`skip  ${slug}`)
    continue
  }
  const url = `https://images.unsplash.com/${p.id}?w=800&h=800&fit=crop&crop=entropy&fm=jpg&q=75`
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    await writeFile(file, Buffer.from(await res.arrayBuffer()))
    console.log(`saved ${slug}`)
  } catch (err) {
    failed++
    console.error(`fail  ${slug}: ${err.message}`)
  }
}
process.exitCode = failed ? 1 : 0

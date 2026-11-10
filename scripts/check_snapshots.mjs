import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const snapshotDir = join(root, 'data', 'normalized')

const checks = [
  { file: 'weather.json', min: 1, keys: ['source', 'fetchedAt', 'cities'] },
  { file: 'quake.json', min: 1, keys: ['source', 'fetchedAt', 'events'] },
  { file: 'heritage.json', min: 1, keys: ['source', 'fetchedAt', 'items'] },
  { file: 'news.json', min: 1, keys: ['source', 'fetchedAt', 'items'] },
]

let failed = false
for (const check of checks) {
  try {
    const data = JSON.parse(await readFile(join(snapshotDir, check.file), 'utf8'))
    for (const key of check.keys) {
      if (!(key in data)) throw new Error(`missing key: ${key}`)
    }
    const rows = data[check.keys[2]]
    if (!Array.isArray(rows) || rows.length < check.min) {
      throw new Error(`${check.keys[2]} must be a non-empty array`)
    }
    console.log(`ok ${check.file}: ${rows.length} records, fetched ${data.fetchedAt}`)
  } catch (error) {
    failed = true
    console.error(`fail ${check.file}: ${error.message}`)
  }
}

if (failed) process.exit(1)
console.log('snapshot check passed')

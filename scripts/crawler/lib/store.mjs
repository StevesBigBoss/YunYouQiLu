import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stamp } from './util.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
export const PROJECT_ROOT = resolve(HERE, '..', '..', '..')
export const DATA_DIR = join(PROJECT_ROOT, 'data')
export const RAW_DIR = join(DATA_DIR, 'raw')
export const NORMALIZED_DIR = join(DATA_DIR, 'normalized')
export const MANIFEST_PATH = join(DATA_DIR, 'manifest.json')

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true })
}

export function writeRaw(source, name, body, ext = 'html') {
  const dir = join(RAW_DIR, source)
  ensureDir(dir)
  const file = join(dir, `${stamp()}-${name}.${ext}`)
  writeFileSync(file, body)
  return file.replace(PROJECT_ROOT + '\\', '').replace(PROJECT_ROOT + '/', '')
}

export function writeNormalized(name, data) {
  ensureDir(NORMALIZED_DIR)
  const file = join(NORMALIZED_DIR, `${name}.json`)
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  return file.replace(PROJECT_ROOT + '\\', '').replace(PROJECT_ROOT + '/', '')
}

export function readManifest() {
  if (!existsSync(MANIFEST_PATH)) return { updatedAt: null, runs: [] }
  try {
    return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
  } catch {
    return { updatedAt: null, runs: [] }
  }
}

export function writeManifest(next) {
  ensureDir(DATA_DIR)
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
  return MANIFEST_PATH
}

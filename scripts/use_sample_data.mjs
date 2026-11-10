import { cp, mkdir, readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const source = join(root, 'data', 'sample', 'normalized')
const target = join(root, 'data', 'normalized')

if (!existsSync(source)) {
  console.error('Missing data/sample/normalized. Restore the sample snapshot from the repository.')
  process.exit(1)
}

await mkdir(target, { recursive: true })
const files = await readdir(source)
for (const name of files) {
  if (!name.endsWith('.json')) continue
  await cp(join(source, name), join(target, name))
}

const sizes = await Promise.all(
  files
    .filter((name) => name.endsWith('.json'))
    .map(async (name) => `${name} (${(await stat(join(source, name))).size} bytes)`),
)
console.log(`Copied ${sizes.length} sample files to data/normalized:`)
for (const line of sizes) console.log(`  ${line}`)
console.log('The front end can now be built without running the crawler.')

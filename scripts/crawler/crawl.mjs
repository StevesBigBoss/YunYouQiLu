#!/usr/bin/env node
import { readManifest, writeManifest, writeNormalized, PROJECT_ROOT } from './lib/store.mjs'
import { sleep } from './lib/util.mjs'
import * as weather from './sources/weather.mjs'
import * as quake from './sources/quake.mjs'
import * as heritage from './sources/heritage.mjs'
import * as news from './sources/news.mjs'

const SOURCES = [weather, quake, heritage, news]

const argv = process.argv.slice(2)
if (argv.includes('--list') || argv.includes('-l')) {
  for (const s of SOURCES) console.log(`${s.id.padEnd(10)} ${s.title}`)
  process.exit(0)
}
const picked = SOURCES.filter((s) => argv.length === 0 || argv.includes(s.id))
if (!picked.length) {
  console.error(`没有匹配的数据源。可选：${SOURCES.map((s) => s.id).join(', ')}`)
  process.exit(1)
}

const startedAt = new Date()
const ctx = { log: (msg) => console.log(`    · ${msg}`) }
const runs = []

console.log(`开始抓取 ${picked.length} 个数据源：${picked.map((s) => s.id).join(', ')}`)
for (const source of picked) {
  console.log(`\n[${source.id}] ${source.title}`)
  const t0 = Date.now()
  let entry
  try {
    const result = await source.run(ctx)
    const file = writeNormalized(source.id, result.data)
    entry = {
      id: source.id,
      title: source.title,
      status: result.problems.length ? 'partial' : 'ok',
      records: result.records,
      problems: result.problems,
      file,
      elapsedMs: Date.now() - t0,
    }
    console.log(`    完成：${result.records} 条 → ${file}（${((Date.now() - t0) / 1000).toFixed(1)}s）`)
    for (const p of result.problems) console.log(`    ! ${p}`)
  } catch (err) {
    entry = { id: source.id, title: source.title, status: 'failed', records: 0, problems: [err.message], file: null, elapsedMs: Date.now() - t0 }
    console.log(`    失败：${err.message}`)
  }
  runs.push(entry)
  await sleep(400)
}

const manifest = readManifest()
manifest.updatedAt = startedAt.toISOString()
manifest.runs.unshift({ startedAt: startedAt.toISOString(), sources: runs })
manifest.runs = manifest.runs.slice(0, 20)
const manifestPath = writeManifest(manifest)

const okCount = runs.filter((r) => r.status === 'ok').length
console.log(`\n汇总：${okCount}/${runs.length} 个源完整成功，共 ${runs.reduce((s, r) => s + r.records, 0)} 条记录`)
console.log(`数据目录：${PROJECT_ROOT}\\data`)
console.log(`  normalized/  整理后的 JSON（前端可直接用）`)
console.log(`  raw/         原始响应快照`)
console.log(`  manifest.json 抓取清单：${manifestPath.replace(PROJECT_ROOT + '\\', '')}`)
if (runs.some((r) => r.status !== 'ok')) process.exitCode = 2

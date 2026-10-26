#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process'
import { createSocket } from 'node:dgram'
import { existsSync, openSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 4173
const CLOUDFLARED =
  [
    join(projectRoot, 'cloudflared.exe'),
    join(projectRoot, '..', 'cloudflared.exe'),
    join(projectRoot, 'scripts', 'cloudflared.exe'),
  ].find((p) => existsSync(p)) ?? join(projectRoot, 'cloudflared.exe')
const PREVIEW_LOG = join(os.tmpdir(), 'sd-preview.log')
const URL_FILE = join(projectRoot, '公网地址.txt')
const NO_TUNNEL = process.argv.includes('--no-tunnel')
const KEEP_OLD = process.argv.includes('--keep')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const say = (msg) => console.log(msg)

function outboundAddress() {
  return new Promise((resolve) => {
    const socket = createSocket('udp4')
    const done = (value) => {
      try {
        socket.close()
      } catch {
      }
      resolve(value)
    }
    socket.once('error', () => done(null))
    socket.connect(53, '8.8.8.8', () => done(socket.address().address))
  })
}

function physicalAddresses() {
  const virtual = /vmware|virtualbox|hyper-v|vethernet|wsl|loopback|bluetooth|docker|tap|tun|vpn|radmin|zerotier/i
  const result = []
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    if (virtual.test(name)) continue
    for (const ni of list ?? []) {
      if (ni.family === 'IPv4' && !ni.internal && !result.includes(ni.address)) result.push(ni.address)
    }
  }
  return result
}

let LAN = []

function candidateAddresses(outbound) {
  const list = []
  const push = (addr) => {
    if (addr && !list.includes(addr)) list.push(addr)
  }
  if (outbound && !outbound.startsWith('26.')) push(outbound)
  for (const addr of physicalAddresses()) push(addr)
  push(outbound)
  return list
}

function localLines() {
  const lines = [`  本机打开：http://localhost:${PORT}/`]
  if (LAN.length) lines.push(`  同一 WiFi 下的手机/电脑：http://${LAN[0]}:${PORT}/`)
  if (LAN.length > 1) {
    lines.push(`  （上面那个打不开的话，试试：${LAN.slice(1, 3).map((a) => `http://${a}:${PORT}/`).join('  ')}）`)
  }
  return lines
}

async function previewAlive() {
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/`, { signal: AbortSignal.timeout(3000) })
    return res.status < 500
  } catch {
    return false
  }
}

async function ensurePreview() {
  if (await previewAlive()) {
    say(`[1/3] 预览服务已在运行：http://localhost:${PORT}/`)
    return true
  }
  if (!existsSync(join(projectRoot, 'dist', 'index.html'))) {
    say('[1/3] 还没有生产构建，先执行构建（约 10 秒）…')
    const build = spawnSync(
      process.execPath,
      [join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js'), 'build'],
      { cwd: projectRoot, stdio: 'inherit' },
    )
    if (build.status !== 0) {
      say('构建失败，请把上面的报错发给开发者。')
      return false
    }
  }
  say(`[1/3] 启动预览服务（端口 ${PORT}）…`)
  const out = openSync(PREVIEW_LOG, 'a')
  spawn(
    process.execPath,
    [
      join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js'),
      'preview',
      '--port',
      String(PORT),
      '--strictPort',
      '--host',
      '0.0.0.0',
    ],
    { cwd: projectRoot, detached: true, stdio: ['ignore', out, out] },
  ).unref()
  for (let i = 0; i < 40; i += 1) {
    await sleep(500)
    if (await previewAlive()) {
      say(`[1/3] 预览服务就绪：http://localhost:${PORT}/`)
      return true
    }
  }
  say(`[1/3] 预览服务没能启动，详情见日志：${PREVIEW_LOG}`)
  return false
}

function lastTunnelUrl(text) {
  const hits = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/g)
  return hits ? hits[hits.length - 1] : null
}

function cleanupOldLogs() {
  try {
    for (const name of readdirSync(os.tmpdir())) {
      if (!name.startsWith('sd-tunnel-') || !name.endsWith('.log')) continue
      const full = join(os.tmpdir(), name)
      const age = Date.now() - statSync(full).mtimeMs
      if (age > 10 * 60 * 1000) unlinkSync(full)
    }
  } catch {
  }
}

function stopOldTunnels() {
  const r = spawnSync('taskkill', ['/F', '/IM', 'cloudflared.exe'], { encoding: 'utf8' })
  const text = `${r.stdout ?? ''}${r.stderr ?? ''}`
  if (/PID \d+/.test(text) || /成功|SUCCESS/i.test(text)) {
    say('[2/3] 已结束旧的隧道进程（旧公网网址同时失效）')
  }
}

async function startTunnel() {
  if (!existsSync(CLOUDFLARED)) {
    say(`[2/3] 找不到 cloudflared.exe（应在 ${CLOUDFLARED}）`)
    say('      可从 https://github.com/cloudflare/cloudflared/releases/latest 下载 windows-amd64 版本放回该位置。')
    return null
  }
  if (!KEEP_OLD) stopOldTunnels()
  const logFile = join(os.tmpdir(), `sd-tunnel-${Date.now()}.log`)
  cleanupOldLogs()
  say('[2/3] 正在向 Cloudflare 申请公网隧道（约 10 秒）…')
  const out = openSync(logFile, 'a')
  spawn(
    CLOUDFLARED,
    ['tunnel', '--url', `http://localhost:${PORT}`, '--logfile', logFile, '--no-autoupdate'],
    { cwd: projectRoot, detached: true, stdio: ['ignore', out, out] },
  ).unref()

  for (let i = 0; i < 80; i += 1) {
    await sleep(500)
    if (!existsSync(logFile)) continue
    const url = lastTunnelUrl(readFileSync(logFile, 'utf8'))
    if (url) {
      const registered = await waitRegistered(logFile)
      return { url, logFile, registered }
    }
  }
  say(`[2/3] 没等到隧道地址，详情见日志：${logFile}`)
  return null
}

async function waitRegistered(logFile) {
  for (let i = 0; i < 60; i += 1) {
    await sleep(500)
    if (!existsSync(logFile)) continue
    if (/Registered tunnel connection/.test(readFileSync(logFile, 'utf8'))) return true
  }
  return false
}

async function verify(url) {
  for (let i = 0; i < 15; i += 1) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
      if (res.status < 500) return res.status
    } catch {
    }
    await sleep(3000)
  }
  return null
}

if (!(await ensurePreview())) process.exit(1)
LAN = candidateAddresses(await outboundAddress())

if (NO_TUNNEL) {
  say('')
  say('============================================================')
  say('  站点已启动，在浏览器里打开：')
  for (const line of localLines()) say(line)
  say('============================================================')
  say('')
  say('说明：这个窗口关掉服务就停了；重新启动请再双击一次本图标。')
  say('      想让别人在外网访问，请用「启动公网访问.bat」。')
  process.exit(0)
}

const tunnel = await startTunnel()
if (!tunnel) process.exit(1)
const { url, logFile, registered } = tunnel

const status = await verify(url)
if (status !== null) {
  say(`[3/3] 公网访问已就绪（HTTP ${status}）`)
} else if (registered) {
  say('[3/3] 隧道已连上 Cloudflare，网址已生成')
  say('      Cloudflare 给新网址写解析记录要 1~3 分钟，现在打开可能还提示找不到网址，')
  say('      等两三分钟再刷新即可；超过 5 分钟仍打不开，重新运行本脚本换一条。')
} else {
  say('[3/3] 隧道没能连上 Cloudflare，详情见日志：' + logFile)
  say('      通常是本机网络问题（公司/学校网络可能屏蔽了隧道），换个网络再试。')
}
say('')
say('============================================================')
say('  别人在任意网络打开这个网址即可访问：')
say(`  ${url}`)
say('')
say('  也可以在本机或同一 WiFi 下打开：')
for (const line of localLines()) say(line)
say('============================================================')
say('')
say('说明：这是 Cloudflare 免费临时隧道，网址会被 Cloudflare 随时回收。')
say('      网址打不开时（浏览器提示找不到 DNS 地址 / 拒绝连接），重新运行本脚本换新网址。')
say('      要长期稳定的地址，需要自己的域名 + Nginx 或 Cloudflare 命名隧道。')

writeFileSync(
  URL_FILE,
  [
    `公网地址：${url}`,
    `生成时间：${new Date().toLocaleString('zh-CN')}`,
    `本机地址：http://localhost:${PORT}/`,
    ...localLines().slice(1),
    '',
    '这是 Cloudflare 免费临时隧道，随时可能被回收。',
    '新网址的解析记录要 1~3 分钟才生效，刚生成时打不开属正常，稍等再试。',
    '网址打不开时，重新双击「启动公网访问.bat」获取新网址。',
    '',
  ].join('\n'),
  'utf8',
)
say(`网址已保存到：${URL_FILE}`)

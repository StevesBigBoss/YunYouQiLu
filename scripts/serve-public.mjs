#!/usr/bin/env node
// 一键启动演示站点。
//
// 默认（不带参数）：启动本机预览服务 + 公网隧道，打印公网网址（给别人访问用）
// 加 --no-tunnel  ：只启动本机预览服务，打印本机/局域网网址（自己或同一 WiFi 下的人看）
// 加 --keep       ：保留已在运行的旧隧道进程（默认会先结束它，避免同时开多条）
//
// 做三件事：
//   1. 确保预览服务在跑（没跑就启动；dist 不存在会先自动构建）
//   2. （默认）启动 cloudflared 隧道，拿到公网网址并验证能否访问
//   3. 把网址写进「公网地址.txt」，方便随时查看
//
// 关于网址：页面不是双击 index.html 就能开的（项目用的是 history 路由 + ES 模块，
// 必须由服务器提供），所以入口是这两个 .bat，它们会先把服务跑起来。
//
// 关于公网网址：Cloudflare 免费「快速隧道」的网址是随机的，而且会被 Cloudflare
// 随时回收（回收后旧网址 DNS 直接解析失败，浏览器报 DNS_PROBE_POSSIBLE 或
// ERR_CONNECTION_REFUSED）。遇到打不开就重新运行一次，会拿到新网址。

import { spawn, spawnSync } from 'node:child_process'
import { createSocket } from 'node:dgram'
import { existsSync, openSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 4173
// cloudflared.exe 可能放在项目里，也可能放在上一层的工作目录里，两处都找
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

/**
 * 找出别人能访问到的那张网卡的地址。
 * 直接遍历网卡列表会先撞上 VMware / WSL / VirtualBox 这些虚拟网卡（会给出
 * 192.168.141.1 这种只有本机认的地址），所以先用 UDP「连」一下外网地址问
 * 内核：它会把默认路由用的出口 IP 告诉我们（UDP connect 不发任何数据包）。
 */
function outboundAddress() {
  return new Promise((resolve) => {
    const socket = createSocket('udp4')
    const done = (value) => {
      try {
        socket.close()
      } catch {
        // 已经关了就算了
      }
      resolve(value)
    }
    socket.once('error', () => done(null))
    socket.connect(53, '8.8.8.8', () => done(socket.address().address))
  })
}

/** 兜底：按网卡名字排掉虚拟网卡后取地址 */
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

/** 局域网地址候选（第一个最可能对），启动时算一次 */
let LAN = []

function candidateAddresses(outbound) {
  const list = []
  const push = (addr) => {
    if (addr && !list.includes(addr)) list.push(addr)
  }
  // Radmin VPN 这类虚拟网段的出口地址别人访问不到，不作为首选
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
  // --host 0.0.0.0：本机、局域网、隧道都能访问
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

/** 取日志里最后一条隧道地址（同一条隧道会打印多次，最新的在最后） */
function lastTunnelUrl(text) {
  const hits = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/g)
  return hits ? hits[hits.length - 1] : null
}

/** 清理以前留下的隧道日志，避免临时目录越堆越多 */
function cleanupOldLogs() {
  try {
    for (const name of readdirSync(os.tmpdir())) {
      if (!name.startsWith('sd-tunnel-') || !name.endsWith('.log')) continue
      const full = join(os.tmpdir(), name)
      // 只删 10 分钟前的，正在写的那个文件删不掉也不影响
      const age = Date.now() - statSync(full).mtimeMs
      if (age > 10 * 60 * 1000) unlinkSync(full)
    }
  } catch {
    // 清理失败无所谓，不影响功能
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
  // 每次用一个新的日志文件：旧文件可能还被上一个进程占着删不掉，
  // 那样解析时会把上一条隧道的旧域名当成本次的结果（会给出已经失效的网址）。
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
      // 等到连接真正注册完成再回报，避免给出一条还没生效的网址
      const registered = await waitRegistered(logFile)
      return { url, logFile, registered }
    }
  }
  say(`[2/3] 没等到隧道地址，详情见日志：${logFile}`)
  return null
}

/** 等 cloudflared 报告「隧道已连上 Cloudflare」——这才说明通道真的通了 */
async function waitRegistered(logFile) {
  for (let i = 0; i < 60; i += 1) {
    await sleep(500)
    if (!existsSync(logFile)) continue
    if (/Registered tunnel connection/.test(readFileSync(logFile, 'utf8'))) return true
  }
  return false
}

async function verify(url) {
  // 新网址的解析记录要 1~3 分钟才出来（本机所在网络实测更慢），
  // 所以这里只等 45 秒意思一下：通了就报「已就绪」，没通就走「已连上、稍等生效」的提示，
  // 不在这里干等几分钟。
  for (let i = 0; i < 15; i += 1) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
      if (res.status < 500) return res.status
    } catch {
      // DNS 还没生效时会立刻抛错，等几秒再试
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
  // 实测：Cloudflare 给新网址生成解析记录要一两分钟（这个网络尤其慢），
  // 通道本身已经连上了，所以这不算失败，只是还要等一下。
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

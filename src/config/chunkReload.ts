import type { Router } from 'vue-router'

/**
 * 旧构建页面「点菜单没反应」的自愈。
 *
 * 每次构建都会给懒加载分包换新的哈希文件名、删掉旧文件。浏览器里还停着上一个构建的
 * 页面（没刷新过）时，点没进过的菜单会去请求老文件名，静态服务的 SPA 回退拿 index.html
 * 来答（HTTP 200 + text/html），浏览器按 JS 模块解析失败 → 动态 import 被拒 → vue-router
 * 中止这次跳转：页面原地不动，看着就是「点了没反应」；已经进过的那几个菜单因为模块还在
 * 内存里所以照常好使。
 *
 * 处理办法：模块加载失败时自动刷新一次拿新构建，刷新后把用户点的那一页补上；冷却时间
 * 用来区分「构建过期」和「服务真连不上」——后者刷新也拿不到分包，不能反复刷。
 */
const PENDING_ROUTE_KEY = 'yunyou-qilu:pending-route'
const RELOAD_AT_KEY = 'yunyou-qilu:reload-at'
const RELOAD_COOLDOWN_MS = 10_000

/** 各浏览器对「模块加载失败」的说法：Chromium 报 MIME 类型，WebKit / 部分内核报 Load failed */
const MODULE_LOAD_ERROR =
  /dynamically imported module|importing a module script failed|load failed|loading chunk|unable to preload|mime type|unexpected token '<'|not a valid javascript/i

/** 用户这次想去的页面：分包请求就发生在这次跳转里，失败时靠它把落点补回来 */
let intendedPath = '/'

function rememberIntended(path: string | undefined) {
  if (path) intendedPath = path
}

/** 带 _r 参数刷新（绕过 index.html 缓存），让页面拿到新构建；冷却期内不再刷 */
function reloadForFreshBuild(): boolean {
  let lastReload = 0
  try {
    lastReload = Number(window.sessionStorage.getItem(RELOAD_AT_KEY) ?? 0)
  } catch {
    // 隐私模式读不到存储，按「没刷过」处理
  }
  if (Date.now() - lastReload < RELOAD_COOLDOWN_MS) return false
  try {
    window.sessionStorage.setItem(PENDING_ROUTE_KEY, intendedPath)
    window.sessionStorage.setItem(RELOAD_AT_KEY, String(Date.now()))
  } catch {
    // 存不进去也照样刷新，只是刷新后停在原页面
  }
  const { pathname, search, hash } = window.location
  window.location.replace(`${pathname}${search}${search ? '&' : '?'}_r=${Date.now()}${hash}`)
  return true
}

/** 挂上自愈：记住跳转目标，模块加载失败时刷新重试 */
export function installChunkReload(router: Router): void {
  router.beforeEach((to) => {
    rememberIntended(to.fullPath)
  })

  // Vite 为动态 import 失败专门派发的事件，官方建议的用法就是在这里刷新。
  // 不拦默认行为：让 Vite 照常把错误抛出去（刷新没走成时导航会正常中止，
  // 控制台也留得下真实原因），刷新本身由下面的 onError 兜底，冷却时间防止刷两次。
  window.addEventListener('vite:preloadError', () => {
    reloadForFreshBuild()
  })

  // 兜底：老浏览器 / 事件没派发到时的模块加载错误
  router.onError((error, to) => {
    const message = String((error as Error)?.message ?? error)
    if (!MODULE_LOAD_ERROR.test(message)) return
    rememberIntended(to?.fullPath)
    reloadForFreshBuild()
  })
}

/** 取出刷新前记下的目标页，取完即清（只补一次） */
export function takePendingRoute(): string | null {
  try {
    const pending = window.sessionStorage.getItem(PENDING_ROUTE_KEY)
    if (pending) window.sessionStorage.removeItem(PENDING_ROUTE_KEY)
    return pending
  } catch {
    return null
  }
}

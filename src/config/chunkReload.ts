import type { Router } from 'vue-router'

const PENDING_ROUTE_KEY = 'yunyou-qilu:pending-route'
const RELOAD_AT_KEY = 'yunyou-qilu:reload-at'
const RELOAD_COOLDOWN_MS = 10_000

const MODULE_LOAD_ERROR =
  /dynamically imported module|importing a module script failed|load failed|loading chunk|unable to preload|mime type|unexpected token '<'|not a valid javascript/i

let intendedPath = '/'

function rememberIntended(path: string | undefined) {
  if (path) intendedPath = path
}

function reloadForFreshBuild(): boolean {
  let lastReload = 0
  try {
    lastReload = Number(window.sessionStorage.getItem(RELOAD_AT_KEY) ?? 0)
  } catch {
  }
  if (Date.now() - lastReload < RELOAD_COOLDOWN_MS) return false
  try {
    window.sessionStorage.setItem(PENDING_ROUTE_KEY, intendedPath)
    window.sessionStorage.setItem(RELOAD_AT_KEY, String(Date.now()))
  } catch {
  }
  const { pathname, search, hash } = window.location
  window.location.replace(`${pathname}${search}${search ? '&' : '?'}_r=${Date.now()}${hash}`)
  return true
}

export function installChunkReload(router: Router): void {
  router.beforeEach((to) => {
    rememberIntended(to.fullPath)
  })

  window.addEventListener('vite:preloadError', () => {
    reloadForFreshBuild()
  })

  router.onError((error, to) => {
    const message = String((error as Error)?.message ?? error)
    if (!MODULE_LOAD_ERROR.test(message)) return
    rememberIntended(to?.fullPath)
    reloadForFreshBuild()
  })
}

export function takePendingRoute(): string | null {
  try {
    const pending = window.sessionStorage.getItem(PENDING_ROUTE_KEY)
    if (pending) window.sessionStorage.removeItem(PENDING_ROUTE_KEY)
    return pending
  } catch {
    return null
  }
}

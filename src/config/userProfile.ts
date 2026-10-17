import { computed, ref } from 'vue'
import { makePasswordHash, verifyPasswordHash, isLegacyPlaintext } from './hash'

/* 演示用的账号信息：没有后端，头像、密码、登录态都放在浏览器本地 */
export const USER_ACCOUNT = 'admin'
export const USER_NAME = '管理员'
export const DEFAULT_PASSWORD = '123456'

const AVATAR_KEY = 'sd-user-avatar'
const PASSWORD_KEY = 'sd-user-password'
const GUEST_KEY = 'sd-user-guest'
const ACCOUNTS_KEY = 'sd-user-accounts'
const CURRENT_KEY = 'sd-user-current'

function read(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? ''
  } catch {
    // 隐私模式等场景下 localStorage 不可用
    return ''
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // 存不下也不影响本次会话内的操作
  }
}

function remove(key: string) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* 同上 */
  }
}

/** 注册账号：演示项目没有后端，密码以「加盐 SHA-256」哈希存本地（不存明文） */
interface RegisteredAccount {
  /** 账号名，保留注册时的写法 */
  account: string
  /** 显示名（昵称），登录后出现在右上角 */
  name: string
  /** 密码哈希存储串：sha256:<盐>:<摘要>（旧数据可能是明文，由校验函数兼容） */
  password: string
}

/** 账号名统一按小写做键，登录时大小写不敏感 */
function accountKey(account: string): string {
  return account.trim().toLowerCase()
}

function readAccounts(): Record<string, RegisteredAccount> {
  const raw = read(ACCOUNTS_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, Partial<RegisteredAccount>>
    if (!parsed || typeof parsed !== 'object') return {}
    const out: Record<string, RegisteredAccount> = {}
    Object.entries(parsed).forEach(([key, item]) => {
      if (!item || typeof item.account !== 'string' || !item.account.trim()) return
      if (typeof item.password !== 'string') return
      out[key] = {
        account: item.account,
        name: typeof item.name === 'string' && item.name ? item.name : item.account,
        password: item.password,
      }
    })
    return out
  } catch {
    // 本地数据被改坏了就当没有注册过账号
    return {}
  }
}

/** 已注册的账号（账号名小写 → 账号信息） */
const accounts = ref<Record<string, RegisteredAccount>>(readAccounts())

/** 当前登录的账号名：默认是演示账号，登录过注册账号后记住它 */
export const currentAccount = ref<string>((() => {
  const stored = accountKey(read(CURRENT_KEY))
  if (!stored || stored === USER_ACCOUNT) return USER_ACCOUNT
  return accounts.value[stored]?.account ?? USER_ACCOUNT
})())

/** 头像图片（dataURL）；空串表示用默认的姓名首字头像 */
export const avatarImage = ref<string>(read(AVATAR_KEY))
/** 以游客身份进入平台（首页「游客登录」）：右上角显示「游客」，不带具体账号 */
export const GUEST_NAME = '游客'
export const isGuest = ref<boolean>(read(GUEST_KEY) === '1')
/** 密码是否已被改过（登录页据此显示不同的提示文案） */
export const hasCustomPassword = ref<boolean>(read(PASSWORD_KEY) !== '')

/** 显示名：游客固定为「游客」，演示账号固定为「管理员」，注册账号用注册时填的昵称 */
export const userName = computed(() => {
  if (isGuest.value) return GUEST_NAME
  const key = accountKey(currentAccount.value)
  if (key === USER_ACCOUNT) return USER_NAME
  return accounts.value[key]?.name ?? USER_NAME
})
export const avatarText = computed(() => userName.value.slice(0, 1))

export function setAvatarImage(dataUrl: string) {
  avatarImage.value = dataUrl
  if (dataUrl) write(AVATAR_KEY, dataUrl)
  else remove(AVATAR_KEY)
}

/** 当前账号的密码存储串（新格式 sha256:<盐>:<摘要>；历史明文由校验函数兼容并自动升级） */
export function currentPassword(): string {
  const key = accountKey(currentAccount.value)
  if (key === USER_ACCOUNT) return read(PASSWORD_KEY) || DEFAULT_PASSWORD
  return accounts.value[key]?.password ?? ''
}

export function verifyPassword(password: string): boolean {
  return verifyPasswordHash(password, currentPassword())
}

export function updatePassword(password: string) {
  const key = accountKey(currentAccount.value)
  if (key === USER_ACCOUNT) {
    if (password === DEFAULT_PASSWORD) {
      remove(PASSWORD_KEY)
      hasCustomPassword.value = false
      return
    }
    write(PASSWORD_KEY, makePasswordHash(password))
    hasCustomPassword.value = true
    return
  }
  const item = accounts.value[key]
  if (!item) return
  item.password = makePasswordHash(password)
  write(ACCOUNTS_KEY, JSON.stringify(accounts.value))
}

/** 忘记密码时的兜底：把演示账号恢复成演示密码，避免把自己锁在外面 */
export function resetPassword() {
  remove(PASSWORD_KEY)
  hasCustomPassword.value = false
}

/** 账号名是否已被占用（演示账号也算占用） */
export function isAccountTaken(account: string): boolean {
  const key = accountKey(account)
  return !key || key === USER_ACCOUNT || !!accounts.value[key]
}

export interface RegisterInput {
  account: string
  /** 昵称，留空时用账号名 */
  name?: string
  password: string
}

/**
 * 注册新账号：校验账号是否已被占用并写入本地存储。
 * 返回空串表示注册成功，否则返回可直接展示给用户的错误文案。
 */
export function registerAccount(input: RegisterInput): string {
  const account = input.account.trim()
  if (!account) return '请输入账号'
  if (isAccountTaken(account)) return '该账号已被注册，换一个试试'
  accounts.value[accountKey(account)] = {
    account,
    name: input.name?.trim() || account,
    password: makePasswordHash(input.password),
  }
  write(ACCOUNTS_KEY, JSON.stringify(accounts.value))
  return ''
}

/** 登录成功后记住当前账号，右上角的名字与后续改密都跟着它走 */
function setCurrentAccount(account: string) {
  const key = accountKey(account)
  const name = key === USER_ACCOUNT ? USER_ACCOUNT : accounts.value[key]?.account ?? USER_ACCOUNT
  currentAccount.value = name
  write(CURRENT_KEY, name)
}

export function verifyAccount(account: string, password: string): boolean {
  const key = accountKey(account)
  if (!key) return false
  if (key === USER_ACCOUNT) {
    const stored = read(PASSWORD_KEY) || DEFAULT_PASSWORD
    if (!verifyPasswordHash(password, stored)) return false
    // 历史明文校验通过后自动升级为哈希存储
    if (isLegacyPlaintext(stored)) write(PASSWORD_KEY, makePasswordHash(password))
    setCurrentAccount(USER_ACCOUNT)
    return true
  }
  const item = accounts.value[key]
  if (!item || !verifyPasswordHash(password, item.password)) return false
  // 历史明文校验通过后自动升级为哈希存储
  if (isLegacyPlaintext(item.password)) {
    item.password = makePasswordHash(password)
    write(ACCOUNTS_KEY, JSON.stringify(accounts.value))
  }
  setCurrentAccount(item.account)
  return true
}

/** 首页/登录页的「游客登录」：记下游客身份后直接进平台 */
export function enterAsGuest() {
  isGuest.value = true
  write(GUEST_KEY, '1')
}

function clearGuest() {
  if (!isGuest.value) return
  isGuest.value = false
  remove(GUEST_KEY)
}

/** 登录成功：取消游客身份，改用登录的账号（进哪个页面由调用方跳转） */
export function login() {
  clearGuest()
}

/** 退出登陆：清掉游客身份，由调用方跳回首页 */
export function logout() {
  clearGuest()
}

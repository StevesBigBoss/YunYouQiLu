import { computed, ref } from 'vue'
import { makePasswordHash, verifyPasswordHash, isLegacyPlaintext } from './hash'

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
    return ''
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
  }
}

function remove(key: string) {
  try {
    window.localStorage.removeItem(key)
  } catch {
  }
}

interface RegisteredAccount {
  account: string
  name: string
  password: string
}

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
    return {}
  }
}

const accounts = ref<Record<string, RegisteredAccount>>(readAccounts())

export const currentAccount = ref<string>((() => {
  const stored = accountKey(read(CURRENT_KEY))
  if (!stored || stored === USER_ACCOUNT) return USER_ACCOUNT
  return accounts.value[stored]?.account ?? USER_ACCOUNT
})())

export const avatarImage = ref<string>(read(AVATAR_KEY))
export const GUEST_NAME = '游客'
export const isGuest = ref<boolean>(read(GUEST_KEY) === '1')
export const hasCustomPassword = ref<boolean>(read(PASSWORD_KEY) !== '')

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

export function resetPassword() {
  remove(PASSWORD_KEY)
  hasCustomPassword.value = false
}

export function isAccountTaken(account: string): boolean {
  const key = accountKey(account)
  return !key || key === USER_ACCOUNT || !!accounts.value[key]
}

export interface RegisterInput {
  account: string
  name?: string
  password: string
}

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
    if (isLegacyPlaintext(stored)) write(PASSWORD_KEY, makePasswordHash(password))
    setCurrentAccount(USER_ACCOUNT)
    return true
  }
  const item = accounts.value[key]
  if (!item || !verifyPasswordHash(password, item.password)) return false
  if (isLegacyPlaintext(item.password)) {
    item.password = makePasswordHash(password)
    write(ACCOUNTS_KEY, JSON.stringify(accounts.value))
  }
  setCurrentAccount(item.account)
  return true
}

export function enterAsGuest() {
  isGuest.value = true
  write(GUEST_KEY, '1')
}

function clearGuest() {
  if (!isGuest.value) return
  isGuest.value = false
  remove(GUEST_KEY)
}

export function login() {
  clearGuest()
}

export function logout() {
  clearGuest()
}

<template>
  <div class="login-screen">
    <AuthBackdrop />

    <!-- 顶栏：左侧品牌点一下即以游客身份进入，右侧保留换语言、回首页与登录入口 -->
    <header class="login-topbar">
      <button
        class="login-brand"
        type="button"
        :title="t('以游客身份直接进入平台')"
        :aria-label="t('云游齐鲁：以游客身份直接进入平台')"
        @click="enterGuest"
      >
        <BrandLogo :size="34" />
        <span class="login-brand-text">
          <span class="login-brand-name">{{ t('云游齐鲁') }}</span>
          <span class="login-brand-sub">{{ t('山东沿黄文旅数智传播平台') }}</span>
        </span>
      </button>
      <div class="login-top-actions">
        <LanguageSwitcher />
        <button class="login-home-link" type="button" @click="goHome">{{ t('返回首页') }}</button>
        <button class="login-entry" type="button" @click="focusLogin">{{ t('登 录') }}</button>
      </div>
    </header>

    <div class="login-body">
      <div class="login-card" :class="{ pulse: cardPulse }">
        <div class="login-head">
          <BrandLogo :size="44" />
          <div class="login-titles">
            <div class="login-title">{{ t('云游齐鲁山东沿黄文旅数智传播平台') }}</div>
            <div class="login-sub">{{ t(isRegister ? '填写信息注册新账号' : '请登录后继续查看数据') }}</div>
          </div>
        </div>

        <div class="mode-tabs" role="tablist">
          <button
            v-for="tab in MODE_TABS"
            :key="tab.key"
            class="mode-tab"
            :class="{ active: mode === tab.key }"
            type="button"
            role="tab"
            :aria-selected="mode === tab.key"
            @click="switchMode(tab.key)"
          >{{ t(tab.label) }}</button>
        </div>

        <form v-if="!isRegister" class="login-form" @submit.prevent="submit">
          <label class="field">
            <span class="field-label">{{ t('账号') }}</span>
            <input ref="accountInput" v-model="account" type="text" autocomplete="username" :placeholder="t('请输入账号')" />
          </label>
          <label class="field">
            <span class="field-label">{{ t('密码') }}</span>
            <input v-model="password" type="password" autocomplete="current-password" :placeholder="t('请输入密码')" />
          </label>
          <p v-if="error" class="msg error">{{ error }}</p>
          <p v-else-if="note" class="msg success">{{ note }}</p>
          <button class="login-btn" type="submit">{{ t('登 录') }}</button>
        </form>

        <form v-else class="login-form" @submit.prevent="submitRegister">
          <label class="field">
            <span class="field-label">{{ t('账号') }}</span>
            <input v-model="regAccount" type="text" autocomplete="username" :placeholder="t('3-20 位字母、数字或下划线')" />
          </label>
          <label class="field">
            <span class="field-label">{{ t('昵称（选填）') }}</span>
            <input v-model="regName" type="text" autocomplete="nickname" :placeholder="t('留空则用账号名')" />
          </label>
          <label class="field">
            <span class="field-label">{{ t('密码') }}</span>
            <input v-model="regPassword" type="password" autocomplete="new-password" :placeholder="t('至少 6 位')" />
          </label>
          <label class="field">
            <span class="field-label">{{ t('确认密码') }}</span>
            <input v-model="regConfirm" type="password" autocomplete="new-password" :placeholder="t('再输入一次密码')" />
          </label>
          <p v-if="regError" class="msg error">{{ regError }}</p>
          <button class="login-btn" type="submit">{{ t('注 册') }}</button>
        </form>

        <div v-if="isRegister || hasCustomPassword" class="login-foot">
          <span v-if="isRegister">{{ t('已有账号？切到上方「登录」直接登录') }}</span>
          <span v-else>{{ t('密码已修改，请使用新密码登录') }}</span>
        </div>
      </div>

      <!-- 不想登录的话，从这里以游客身份直接进平台 -->
      <div class="login-more">
        <span class="login-more-text">{{ t('暂不登录') }}</span>
        <button class="link-btn" type="button" @click="enterGuest">{{ t('以游客身份进入 →') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthBackdrop from './AuthBackdrop.vue'
import BrandLogo from './BrandLogo.vue'
import LanguageSwitcher from './LanguageSwitcher.vue'
import { t } from '../../config/i18n'
import {
  currentAccount,
  enterAsGuest,
  hasCustomPassword,
  isAccountTaken,
  login,
  registerAccount,
  verifyAccount,
} from '../../config/userProfile'

type Mode = 'login' | 'register'

const MODE_TABS: { key: Mode; label: string }[] = [
  { key: 'login', label: '登录' },
  { key: 'register', label: '注册' },
]

const router = useRouter()

const mode = ref<Mode>('login')
const isRegister = computed(() => mode.value === 'register')

// 退出登录后再进来，账号默认带出上次登录的那个
const account = ref(currentAccount.value)
const password = ref('')
const error = ref('')
const note = ref('')

const regAccount = ref('')
const regName = ref('')
const regPassword = ref('')
const regConfirm = ref('')
const regError = ref('')

const accountInput = ref<HTMLInputElement | null>(null)
const cardPulse = ref(false)
let pulseTimer: number | undefined

function switchMode(next: Mode) {
  if (mode.value === next) return
  mode.value = next
  error.value = ''
  note.value = ''
  regError.value = ''
  // 切到注册时清空表单，避免带着登录时输的内容继续注册
  if (next === 'register') {
    regAccount.value = ''
    regName.value = ''
    regPassword.value = ''
    regConfirm.value = ''
    password.value = ''
  }
}

function submit() {
  if (!account.value.trim()) {
    error.value = t('请输入账号')
    return
  }
  if (!password.value) {
    error.value = t('请输入密码')
    return
  }
  if (!verifyAccount(account.value, password.value)) {
    error.value = t('账号或密码不正确')
    password.value = ''
    return
  }
  error.value = ''
  note.value = ''
  password.value = ''
  login()
  void router.push('/dashboard')
}

/** 注册账号的格式要求：与「更改密码」里最少 6 位保持一致 */
const ACCOUNT_PATTERN = /^[A-Za-z0-9_]{3,20}$/

function submitRegister() {
  const name = regAccount.value.trim()
  if (!name) {
    regError.value = t('请输入账号')
    return
  }
  if (!ACCOUNT_PATTERN.test(name)) {
    regError.value = t('账号需为 3-20 位字母、数字或下划线')
    return
  }
  if (regName.value.trim().length > 12) {
    regError.value = t('昵称不要超过 12 个字')
    return
  }
  if (regPassword.value.length < 6) {
    regError.value = t('密码至少 6 位')
    return
  }
  if (regPassword.value !== regConfirm.value) {
    regError.value = t('两次输入的密码不一致')
    return
  }
  // 查重放在这里做：userProfile 里返回的提示语是中文常量，走 t() 才能跟着语言变
  if (isAccountTaken(name)) {
    regError.value = t('该账号已被注册，换一个试试')
    return
  }
  registerAccount({ account: name, name: regName.value, password: regPassword.value })
  // 注册成功后回到登录表单：账号填好、密码留空，接着就能用新账号登录
  regAccount.value = ''
  regName.value = ''
  regPassword.value = ''
  regConfirm.value = ''
  regError.value = ''
  mode.value = 'login'
  account.value = name
  password.value = ''
  error.value = ''
  note.value = t('账号 {name} 注册成功，请使用新密码登录', { name })
}

function goHome() {
  void router.push('/')
}

/**
 * 右上角「登录」：不管当前停在哪个分页，都把注意力带回卡片——
 * 切回登录表单、聚焦账号输入框，卡片轻闪一圈作提示
 */
async function focusLogin() {
  if (isRegister.value) switchMode('login')
  await nextTick()
  accountInput.value?.focus()
  cardPulse.value = false
  await nextTick()
  cardPulse.value = true
  window.clearTimeout(pulseTimer)
  pulseTimer = window.setTimeout(() => {
    cardPulse.value = false
  }, 1000)
}

onBeforeUnmount(() => window.clearTimeout(pulseTimer))

/** 登录页也能以游客身份直接进平台（等同首页的「游客登录」） */
function enterGuest() {
  enterAsGuest()
  void router.push('/dashboard')
}
</script>

<style scoped>
.login-screen {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(162deg, var(--bg-primary) 0%, var(--bg-secondary) 54%, var(--bg-primary) 100%);
}

/* 顶栏：左侧品牌（点击即游客进入）、右侧回首页与登录入口 */
.login-topbar {
  position: absolute;
  top: 18px;
  left: 24px;
  right: 24px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.login-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px 6px 6px;
  background: transparent;
  border: none;
  border-radius: 12px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s;
}
.login-brand:hover {
  background: var(--surface-glass-strong, var(--bg-card));
}
.login-brand-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.login-brand-name {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--text-primary);
}
.login-brand-sub {
  font-size: 11px;
  color: var(--text-muted);
}
.login-top-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}
.login-home-link {
  padding: 6px 4px;
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: color 0.2s;
}
.login-home-link:hover {
  color: var(--text-gold);
}
/* 右上角白色「登录」框：与卡片里的主按钮区分开，白底 + 主题绿悬停 */
.login-entry {
  padding: 8px 20px;
  background: #FFFFFF;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  letter-spacing: 2px;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, box-shadow 0.2s;
}
.login-entry:hover {
  color: var(--text-gold);
  border-color: var(--color-gold);
  box-shadow: 0 3px 10px rgba(var(--rgb-gold), 0.18);
}

.login-body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  max-width: 100%;
}

.login-card {
  position: relative;
  width: 380px;
  max-width: calc(100% - 32px);
  padding: 26px 28px 18px;
  background: var(--surface-glass-strong, var(--bg-card));
  -webkit-backdrop-filter: blur(14px) saturate(1.06);
  backdrop-filter: blur(14px) saturate(1.06);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  box-shadow: var(--shadow-card), 0 16px 40px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}
/* 顶部一道主题色金线，与背景的晨曦呼应 */
.login-card::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: var(--gradient-gold);
}

/* 点右上角「登录」时卡片轻闪一圈，把视线带回到表单 */
.login-card.pulse {
  animation: loginCardPulse 1s ease;
}
@keyframes loginCardPulse {
  0%, 100% {
    border-color: var(--border-color);
    box-shadow: var(--shadow-card), 0 16px 40px rgba(0, 0, 0, 0.08);
  }
  35% {
    border-color: var(--color-gold);
    box-shadow: var(--shadow-card), 0 0 0 5px rgba(var(--rgb-gold), 0.16), 0 16px 40px rgba(0, 0, 0, 0.08);
  }
}

.login-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 18px;
  margin-bottom: 18px;
  border-bottom: 1px solid var(--border-color);
}
.login-titles {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.login-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-gold);
  /* 标题偏长时会折行，均分两行，免得行尾只剩一个字 */
  text-wrap: balance;
}
.login-sub {
  font-size: 12px;
  color: var(--text-muted);
}

/* 卡片下方的游客入口 */
.login-more {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
}
.link-btn {
  padding: 0;
  background: none;
  border: none;
  color: var(--text-gold);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}
.link-btn:hover {
  text-decoration: underline;
}

/* 登录 / 注册 切换 */
.mode-tabs {
  display: flex;
  gap: 4px;
  padding: 3px;
  margin-bottom: 16px;
  background: var(--bg-input, var(--bg-card));
  border: 1px solid var(--border-color);
  border-radius: 10px;
}
.mode-tab {
  flex: 1;
  padding: 7px 0;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 13px;
  font-family: inherit;
  letter-spacing: 1px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.mode-tab:hover {
  color: var(--text-gold);
}
.mode-tab.active {
  background: var(--gradient-gold);
  color: var(--on-accent);
  font-weight: 600;
}

.field {
  display: block;
}
.field + .field {
  margin-top: 14px;
}
.field-label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}
.field input {
  width: 100%;
  padding: 9px 11px;
  background: var(--bg-input, var(--bg-card));
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}
.field input:focus {
  border-color: var(--color-gold);
}
.field input::placeholder {
  color: var(--text-muted);
}

.msg {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.6;
}
.msg.error {
  color: var(--status-danger);
}
.msg.success {
  color: var(--status-success);
}

.login-btn {
  width: 100%;
  margin-top: 18px;
  padding: 10px;
  background: var(--gradient-gold);
  color: var(--on-accent);
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  letter-spacing: 2px;
  cursor: pointer;
  transition: opacity 0.2s;
}
.login-btn:hover {
  opacity: 0.9;
}

.login-foot {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 16px;
  font-size: 11px;
  color: var(--text-muted);
}
</style>

<template>
  <div ref="rootRef" class="user-menu">
    <button class="user-entry" type="button" aria-haspopup="menu" :aria-expanded="open" @click="toggle">
      <span class="user-avatar">
        <img v-if="avatarImage" class="avatar-img" :src="avatarImage" :alt="t('头像')" />
        <template v-else>{{ avatarLetter }}</template>
      </span>
      <span class="user-name">{{ t(userName) }}</span>
      <span class="user-caret" :class="{ open }"><AppIcon name="caret-down" :size="12" /></span>
    </button>

    <transition name="user-pop">
      <div v-if="open" class="user-panel" role="menu">
        <div class="panel-head">
          <span class="user-avatar head-avatar">
            <img v-if="avatarImage" class="avatar-img" :src="avatarImage" :alt="t('头像')" />
            <template v-else>{{ avatarLetter }}</template>
          </span>
          <span class="head-meta">
            <span class="head-name">{{ t(userName) }}</span>
            <span class="head-account">
              {{ isGuest ? t('账号：游客（未登录）') : t('账号：{account}', { account: currentAccount }) }}
            </span>
          </span>
        </div>
        <template v-if="!isGuest">
          <div class="menu-item" role="menuitem" @click="openAvatarDialog">{{ t('更改头像') }}</div>
          <div class="menu-item" role="menuitem" @click="openPasswordDialog">{{ t('更改密码') }}</div>
          <div class="menu-split"></div>
        </template>
        <p v-else class="guest-note">{{ t('以游客身份浏览中，登录后可更改头像与密码') }}</p>
        <div class="menu-item danger" role="menuitem" @click="askLogout">{{ t('退出登陆') }}</div>
      </div>
    </transition>

    <Teleport to="body">
      <div v-if="avatarOpen" class="dialog-mask" @click.self="closeAvatarDialog">
        <div class="dialog" role="dialog" :aria-label="t('更改头像')">
          <div class="dialog-title">{{ t('更改头像') }}</div>
          <div class="dialog-body avatar-body">
            <span class="avatar-preview">
              <img v-if="avatarDraft" :src="avatarDraft" :alt="t('头像预览')" />
              <template v-else>{{ avatarLetter }}</template>
            </span>
            <div class="avatar-actions">
              <button class="btn" type="button" @click="pickFile">{{ t('选择图片') }}</button>
              <button class="btn" type="button" :disabled="!avatarDraft" @click="avatarDraft = ''">
                {{ t('恢复默认') }}
              </button>
            </div>
            <input ref="fileRef" class="file-input" type="file" accept="image/*" @change="onPickFile" />
            <p class="hint">{{ t('支持 JPG / PNG，选好后会自动裁成方形，图片只存在本机浏览器。') }}</p>
            <p v-if="avatarError" class="msg error">{{ avatarError }}</p>
          </div>
          <div class="dialog-foot">
            <button class="btn" type="button" @click="closeAvatarDialog">{{ t('取消') }}</button>
            <button class="btn btn-primary" type="button" @click="saveAvatar">{{ t('保存') }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="passwordOpen" class="dialog-mask" @click.self="closePasswordDialog">
        <form class="dialog" role="dialog" :aria-label="t('更改密码')" @submit.prevent="submitPassword">
          <div class="dialog-title">{{ t('更改密码') }}</div>
          <div class="dialog-body">
            <label class="field">
              <span class="field-label">{{ t('原密码') }}</span>
              <input
                v-model="passwordForm.oldPwd"
                type="password"
                autocomplete="current-password"
                :placeholder="t('请输入原密码')"
              />
            </label>
            <label class="field">
              <span class="field-label">{{ t('新密码') }}</span>
              <input
                v-model="passwordForm.newPwd"
                type="password"
                autocomplete="new-password"
                :placeholder="t('至少 6 位')"
              />
            </label>
            <label class="field">
              <span class="field-label">{{ t('确认新密码') }}</span>
              <input
                v-model="passwordForm.confirmPwd"
                type="password"
                autocomplete="new-password"
                :placeholder="t('请再次输入新密码')"
              />
            </label>
            <p v-if="passwordError" class="msg error">{{ passwordError }}</p>
            <p v-else-if="passwordSaved" class="msg success">{{ t('密码已更新，下次登录请用新密码。') }}</p>
          </div>
          <div class="dialog-foot">
            <button class="btn" type="button" @click="closePasswordDialog">{{ t('取消') }}</button>
            <button class="btn btn-primary" type="submit">{{ t('确定') }}</button>
          </div>
        </form>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="logoutOpen" class="dialog-mask" @click.self="logoutOpen = false">
        <div class="dialog" role="dialog" :aria-label="t('退出登陆')">
          <div class="dialog-title">{{ t('退出登陆') }}</div>
          <div class="dialog-body">
            <p class="confirm-text">
              {{ t('确定要退出吗（当前身份：{name}）？退出后将返回平台首页。', { name: userName }) }}
            </p>
          </div>
          <div class="dialog-foot">
            <button class="btn" type="button" @click="logoutOpen = false">{{ t('取消') }}</button>
            <button class="btn btn-danger" type="button" @click="confirmLogout">{{ t('退出登陆') }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from './AppIcon.vue'
import { t } from '../../config/i18n'
import {
  avatarImage,
  currentAccount,
  isGuest,
  logout,
  setAvatarImage,
  updatePassword,
  userName,
  verifyPassword,
} from '../../config/userProfile'

const avatarLetter = computed(() => t(userName.value).slice(0, 1))

const router = useRouter()
const rootRef = ref<HTMLElement | null>(null)
const open = ref(false)

const avatarOpen = ref(false)
const avatarDraft = ref('')
const avatarError = ref('')
const fileRef = ref<HTMLInputElement | null>(null)

const passwordOpen = ref(false)
const passwordForm = reactive({ oldPwd: '', newPwd: '', confirmPwd: '' })
const passwordError = ref('')
const passwordSaved = ref(false)

const logoutOpen = ref(false)

function toggle() {
  open.value = !open.value
}

function openAvatarDialog() {
  open.value = false
  avatarDraft.value = avatarImage.value
  avatarError.value = ''
  avatarOpen.value = true
}

function closeAvatarDialog() {
  avatarOpen.value = false
  avatarError.value = ''
}

function pickFile() {
  fileRef.value?.click()
}

function toSquareDataUrl(img: HTMLImageElement): string {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return img.src
  const scale = Math.max(size / img.width, size / img.height)
  const width = img.width * scale
  const height = img.height * scale
  ctx.drawImage(img, (size - width) / 2, (size - height) / 2, width, height)
  return canvas.toDataURL('image/png')
}

function onPickFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    avatarError.value = t('请选择图片文件')
    return
  }
  if (file.size > 4 * 1024 * 1024) {
    avatarError.value = t('图片不要超过 4MB')
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    const img = new Image()
    img.onload = () => {
      avatarDraft.value = toSquareDataUrl(img)
      avatarError.value = ''
    }
    img.onerror = () => {
      avatarError.value = t('这张图片读不出来，换一张试试')
    }
    img.src = String(reader.result)
  }
  reader.onerror = () => {
    avatarError.value = t('这张图片读不出来，换一张试试')
  }
  reader.readAsDataURL(file)
}

function saveAvatar() {
  setAvatarImage(avatarDraft.value)
  closeAvatarDialog()
}

function openPasswordDialog() {
  open.value = false
  passwordForm.oldPwd = ''
  passwordForm.newPwd = ''
  passwordForm.confirmPwd = ''
  passwordError.value = ''
  passwordSaved.value = false
  passwordOpen.value = true
}

function closePasswordDialog() {
  passwordOpen.value = false
  passwordError.value = ''
  passwordSaved.value = false
}

function submitPassword() {
  const { oldPwd, newPwd, confirmPwd } = passwordForm
  if (!oldPwd || !newPwd || !confirmPwd) {
    passwordError.value = t('请把三项都填完整')
    return
  }
  if (!verifyPassword(oldPwd)) {
    passwordError.value = t('原密码不正确')
    return
  }
  if (newPwd.length < 6) {
    passwordError.value = t('新密码至少 6 位')
    return
  }
  if (newPwd === oldPwd) {
    passwordError.value = t('新密码不能和原密码相同')
    return
  }
  if (newPwd !== confirmPwd) {
    passwordError.value = t('两次输入的新密码不一致')
    return
  }
  updatePassword(newPwd)
  passwordForm.oldPwd = ''
  passwordForm.newPwd = ''
  passwordForm.confirmPwd = ''
  passwordError.value = ''
  passwordSaved.value = true
  window.setTimeout(() => {
    passwordOpen.value = false
    passwordSaved.value = false
  }, 1000)
}

function askLogout() {
  open.value = false
  logoutOpen.value = true
}

function confirmLogout() {
  logoutOpen.value = false
  logout()
  void router.push('/')
}

function onDocumentClick(event: MouseEvent) {
  if (!open.value) return
  const el = rootRef.value
  if (el && event.target instanceof Node && !el.contains(event.target)) open.value = false
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  if (logoutOpen.value) logoutOpen.value = false
  else if (passwordOpen.value) closePasswordDialog()
  else if (avatarOpen.value) closeAvatarDialog()
  else if (open.value) open.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onDocumentKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onDocumentKeydown)
})
</script>

<style scoped>
.user-menu {
  position: relative;
}

.user-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 8px 3px 3px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 20px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.user-entry:hover {
  background: var(--bg-secondary);
  border-color: var(--border-color);
}

.user-avatar {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--gradient-gold);
  color: var(--on-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  overflow: hidden;
}
.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.user-name {
  font-size: 13px;
  color: var(--text-secondary);
}
.user-caret {
  display: inline-flex;
  color: var(--text-muted);
  transition: transform 0.2s;
}
.user-caret.open {
  transform: rotate(180deg);
}

.user-panel {
  position: absolute;
  right: 0;
  top: calc(100% + 10px);
  z-index: 3000;
  width: 200px;
  padding: 8px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
}
.panel-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 6px 10px;
}
.head-avatar {
  width: 34px;
  height: 34px;
  font-size: 14px;
}
.head-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow: hidden;
}
.head-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.head-account {
  font-size: 11px;
  color: var(--text-muted);
}
.menu-item {
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}
.menu-item:hover {
  background: var(--bg-card-hover);
  color: var(--text-gold);
}
.menu-item.danger:hover {
  color: var(--status-danger);
  background: rgba(var(--rgb-red), 0.12);
}
.menu-split {
  height: 1px;
  margin: 6px 4px;
  background: var(--border-color);
}
.guest-note {
  margin: 0 4px 6px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--bg-secondary);
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-muted);
}

.user-pop-enter-active,
.user-pop-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}
.user-pop-enter-from,
.user-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 4000;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
}
.dialog {
  width: 360px;
  max-width: calc(100vw - 40px);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.28);
  overflow: hidden;
}
.dialog-title {
  padding: 14px 18px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
}
.dialog-body {
  padding: 16px 18px;
}
.dialog-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 18px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.avatar-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.avatar-preview {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--gradient-gold);
  color: var(--on-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 700;
  overflow: hidden;
  box-shadow: 0 0 0 3px rgba(var(--rgb-gold), 0.18);
}
.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.avatar-actions {
  display: flex;
  gap: 10px;
}
.file-input {
  display: none;
}
.hint {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  line-height: 1.6;
}

.field {
  display: block;
}
.field + .field {
  margin-top: 12px;
}
.field-label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}
.field input {
  width: 100%;
  padding: 8px 10px;
  background: var(--bg-input, var(--bg-card));
  border: 1px solid var(--border-color);
  border-radius: 6px;
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
.confirm-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary);
}

.btn-danger {
  background: var(--status-danger);
  color: #ffffff;
  border: none;
  font-weight: 600;
}
.btn-danger:hover {
  opacity: 0.9;
}
</style>

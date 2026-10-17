<template>
  <!-- 平台首页：仿 Modrinth 首页 —— 左上角图标入口、右上角登录、居中大图标、平台名、轮播功能词、
       两个入口按钮，下面一行流动图文（1:1 圆角方图＋名称简介，一屏之内全部可见） -->
  <div class="landing">
    <AuthBackdrop />

    <!-- 顶栏：左上角软件图标＋平台名（点一下直接以游客身份进平台），右上角换语言与登录 -->
    <header class="landing-top">
      <button class="brand-entry" type="button" :aria-label="t('以游客身份进入云游齐鲁')" @click="enterAsVisitor">
        <BrandLogo :size="34" :label="t('云游齐鲁')" />
        <span class="brand-entry-name">{{ t('云游齐鲁') }}</span>
      </button>
      <div class="landing-actions">
        <LanguageSwitcher />
        <button class="top-login" type="button" @click="goLogin">{{ t('登 录') }}</button>
      </div>
    </header>

    <main class="hero">
      <div class="hero-logo">
        <BrandLogo :size="84" :label="t('云游齐鲁')" />
      </div>

      <h1 class="hero-name">{{ t('云游齐鲁') }}</h1>
      <p class="hero-sub">{{ t('山东沿黄文旅数智传播平台') }}</p>

      <h2
        class="hero-tagline"
        :aria-label="t('聚焦山东沿黄文旅数据：旅游景点、饮食文化、客流监测、文旅产业、文旅资源、生态舆情、灾害监测、文化遗产、智慧营销')"
      >
        <span class="tag-static">{{ t('聚焦山东沿黄') }}</span>
        <span class="rotator" aria-hidden="true">
          <Transition name="word" mode="out-in">
            <span :key="featureIndex" class="rot-word">{{ t(FEATURES[featureIndex]) }}</span>
          </Transition>
        </span>
      </h2>

      <p class="hero-note">{{ t('地图、图表与舆情一屏总览 · 文旅数据全景看板') }}</p>

      <div class="hero-actions">
        <button class="hero-btn ghost" type="button" @click="enterAsVisitor">{{ t('游客登录') }}</button>
        <button class="hero-btn primary" type="button" @click="goLogin">{{ t('登 录') }}</button>
      </div>
    </main>

    <!-- 流动图带：铺满整幅宽度，一行到底，一进首页就在视野里 -->
    <ImageMarquee class="landing-strip" />

    <footer class="landing-foot">{{ t('山东沿黄九市文旅数据 · 演示环境') }}</footer>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthBackdrop from '../components/common/AuthBackdrop.vue'
import BrandLogo from '../components/common/BrandLogo.vue'
import ImageMarquee from '../components/common/ImageMarquee.vue'
import LanguageSwitcher from '../components/common/LanguageSwitcher.vue'
import { t } from '../config/i18n'
import { enterAsGuest } from '../config/userProfile'

const router = useRouter()

/** 滚动切换的功能词：中文都是四个字，切换时宽度稳定；换成别的语言长度不一，靠固定高度窗口兜住不跳版 */
const FEATURES = [
  '旅游景点',
  '饮食文化',
  '客流监测',
  '文旅产业',
  '文旅资源',
  '生态舆情',
  '灾害监测',
  '文化遗产',
  '智慧营销',
]

const featureIndex = ref(0)
let ticker = 0

onMounted(() => {
  ticker = window.setInterval(() => {
    featureIndex.value = (featureIndex.value + 1) % FEATURES.length
  }, 2400)
})
onBeforeUnmount(() => {
  window.clearInterval(ticker)
})

/** 游客登录：不校验账号，记下游客身份直接进平台 */
function enterAsVisitor() {
  enterAsGuest()
  void router.push('/dashboard')
}

function goLogin() {
  void router.push('/login')
}
</script>

<style scoped>
.landing {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  min-height: 100%;
  /* 上下留出顶栏和页脚的位置，中间内容整体居中：图标、文字、胶片一屏收得下，不用滚轮 */
  padding: 62px 0 34px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(162deg, var(--bg-primary) 0%, var(--bg-secondary) 54%, var(--bg-primary) 100%);
}

/* 顶栏：左上角图标＋平台名（点一下直接游客进平台），右上角登录键 */
.landing-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 26px;
}
.brand-entry {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px 6px 6px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.16s ease;
}
.brand-entry:hover {
  border-color: var(--border-color);
  background: var(--surface-glass-strong, var(--bg-card));
  transform: translateY(-1px);
}
.brand-entry:active {
  transform: translateY(1px);
}
.brand-entry-name {
  font-size: 19px;
  font-weight: 800;
  letter-spacing: 2px;
  background: var(--gradient-gold);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.top-login {
  min-width: 104px;
  padding: 10px 26px;
  border: none;
  border-radius: 12px;
  background: var(--gradient-gold);
  color: var(--on-accent);
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 2px;
  cursor: pointer;
  box-shadow: var(--shadow-glow-gold);
  transition: transform 0.16s ease, box-shadow 0.2s ease;
}
.top-login:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 22px rgba(var(--rgb-gold), 0.34);
}
.top-login:active {
  transform: translateY(1px);
}
/* 右上角：换语言 ＋ 登录，横排对齐 */
.landing-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hero {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 0 24px 6px;
}

/* 进场：各元素自上而下依次浮现 */
.hero > * {
  animation: hero-rise 0.7s cubic-bezier(0.22, 0.61, 0.36, 1) backwards;
}
.hero-logo { animation-delay: 0.04s; }
.hero-name { animation-delay: 0.12s; }
.hero-sub { animation-delay: 0.18s; }
.hero-tagline { animation-delay: 0.24s; }
.hero-note { animation-delay: 0.3s; }
.hero-actions { animation-delay: 0.36s; }
@keyframes hero-rise {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* 大图标：下面垫一层主题色光晕，和底图右上角的圆环彼此呼应 */
.hero-logo {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hero-logo::before {
  content: '';
  position: absolute;
  width: 232px;
  height: 232px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(var(--rgb-gold), 0.2) 0%, rgba(var(--rgb-gold), 0) 68%);
}
.hero-logo :deep(.brand-logo) {
  box-shadow:
    0 14px 40px rgba(var(--rgb-gold), 0.28),
    inset 0 0 0 1px rgba(255, 255, 255, 0.38);
}

.hero-name {
  margin: 12px 0 0;
  font-size: clamp(32px, 3.7vw, 46px);
  font-weight: 800;
  letter-spacing: 3px;
  background: var(--gradient-gold);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.hero-sub {
  margin: 10px 0 0;
  font-size: clamp(14px, 1.5vw, 17px);
  letter-spacing: 7px;
  text-indent: 7px;
  color: var(--text-secondary);
}
/* 7px 字距是给中文看的；拉丁/西里尔/阿拉伯文下会拉得太散，收到 2px */
html:not([data-locale='zh-CN']):not([data-locale='zh-TW']) .hero-sub {
  letter-spacing: 2px;
  text-indent: 2px;
}

.hero-tagline {
  margin: 16px 0 0;
  font-size: clamp(20px, 2.1vw, 27px);
  font-weight: 800;
  color: var(--text-primary);
  white-space: nowrap;
}
.tag-static {
  margin-right: 6px;
}

/* 滚动切换的功能词：定高窗口内上下滑动，只动这一小块 */
.rotator {
  position: relative;
  display: inline-block;
  height: 1.32em;
  line-height: 1.32;
  overflow: hidden;
  vertical-align: bottom;
}
.rot-word {
  display: inline-block;
  color: var(--text-gold);
}
.word-enter-active,
.word-leave-active {
  transition: transform 0.42s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.42s ease;
}
.word-enter-from {
  transform: translateY(105%);
  opacity: 0;
}
.word-leave-to {
  transform: translateY(-105%);
  opacity: 0;
}

.hero-note {
  margin: 10px 0 0;
  font-size: 14px;
  letter-spacing: 1px;
  color: var(--text-muted);
}

/* 两个入口：游客登录（描边）与登录（主题色实体），主次分明 */
.hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 14px;
  margin-top: 18px;
}
.hero-btn {
  min-width: 144px;
  padding: 10px 26px;
  border-radius: 12px;
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 2px;
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.2s ease, background 0.2s ease, color 0.2s ease,
    border-color 0.2s ease;
}
.hero-btn:active {
  transform: translateY(1px);
}
.hero-btn.primary {
  border: none;
  background: var(--gradient-gold);
  color: var(--on-accent);
  box-shadow: var(--shadow-glow-gold);
}
.hero-btn.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 22px rgba(var(--rgb-gold), 0.34);
}
.hero-btn.ghost {
  border: 1px solid var(--border-color);
  background: var(--surface-glass-strong, var(--bg-card));
  color: var(--text-primary);
}
.hero-btn.ghost:hover {
  border-color: var(--color-gold);
  color: var(--text-gold);
  transform: translateY(-1px);
}

.landing-strip {
  position: relative;
  z-index: 1;
  margin-top: 26px;
  animation: hero-rise 0.7s cubic-bezier(0.22, 0.61, 0.36, 1) 0.42s backwards;
}

.landing-foot {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 22px;
  z-index: 1;
  text-align: center;
  font-size: 12px;
  letter-spacing: 1px;
  color: var(--text-muted);
}

@media (prefers-reduced-motion: reduce) {
  .hero > *,
  .landing-strip {
    animation: none;
  }
  .word-enter-active,
  .word-leave-active {
    transition: none;
  }
}
</style>

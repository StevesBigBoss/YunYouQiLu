<script setup lang="ts">
import { LANDING_STRIP } from '../../config/landingStrip'
import { t, tv } from '../../config/i18n'

/** Fisher–Yates 洗牌（不改动原数组）：每次进首页都换一个顺序，不再固定从某张图开头 */
function shuffle<T>(list: readonly T[]): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const swap = out[i]
    out[i] = out[j]
    out[j] = swap
  }
  return out
}

/** 一行到底、循环不留头：整条铺两份共用同一个随机顺序，位移恰好一份的长度，接口处接得上 */
const strip = shuffle(LANDING_STRIP)
const base = import.meta.env.BASE_URL
</script>

<template>
  <!-- 一行横向流动的图文条目：淡色描边的圆角矩形，1:1 圆角方图在左，名称在上、简介在下 -->
  <div class="marquee" :aria-label="t('齐鲁风物影像')">
    <div class="marquee-band">
      <div class="marquee-track">
        <figure v-for="item in strip" :key="item.src" class="marquee-item">
          <img
            class="marquee-thumb"
            :src="`${base}${item.src}`"
            :alt="`${tv(item.name)}——${tv(item.intro)}`"
            loading="lazy"
            decoding="async"
          />
          <figcaption class="marquee-meta">
            <span class="marquee-name">{{ tv(item.name) }}</span>
            <span class="marquee-intro">{{ tv(item.intro) }}</span>
          </figcaption>
        </figure>
        <!-- 循环用的第二份，纯占位，读屏跳过 -->
        <figure v-for="item in strip" :key="`loop-${item.src}`" class="marquee-item" aria-hidden="true">
          <img class="marquee-thumb" :src="`${base}${item.src}`" alt="" loading="lazy" decoding="async" />
          <figcaption class="marquee-meta">
            <span class="marquee-name">{{ tv(item.name) }}</span>
            <span class="marquee-intro">{{ tv(item.intro) }}</span>
          </figcaption>
        </figure>
      </div>
    </div>
  </div>
</template>

<style scoped>
.marquee {
  width: 100%;
}

/* 视窗：透明的裁剪区，两端用蒙版淡出，条目从画面外滚进来 */
.marquee-band {
  position: relative;
  overflow: hidden;
  padding: 6px 0;
  background: transparent;
  -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 3.5%, #000 96.5%, transparent 100%);
  mask-image: linear-gradient(90deg, transparent 0, #000 3.5%, #000 96.5%, transparent 100%);
}

/* 走带：整条横向匀速平移一份的长度，鼠标悬停停下给人看清 */
.marquee-track {
  display: flex;
  align-items: center;
  width: max-content;
  animation: marquee-roll var(--marquee-dur, 96s) linear infinite;
  will-change: transform;
}
.marquee-band:hover .marquee-track {
  animation-play-state: paused;
}
@keyframes marquee-roll {
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(-50%, 0, 0);
  }
}

/* 一条：定宽圆角矩形，淡色描边框住、底透明，左侧方图、右侧两行文字 */
.marquee-item {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
  width: 248px;
  margin: 0 16px 0 0;
  padding: 8px;
  border: 1px solid rgba(var(--rgb-gold), 0.3);
  border-radius: 16px;
  background: transparent;
  transition: background 0.2s ease, border-color 0.2s ease;
}
.marquee-band:hover .marquee-item {
  border-color: rgba(var(--rgb-gold), 0.5);
  background: var(--surface-glass);
}

/* 缩略图：裁成 1:1 的圆角方形 */
.marquee-thumb {
  display: block;
  flex: 0 0 auto;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  object-fit: cover;
  background: var(--bg-secondary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

/* 右栏：名称顶到图片上沿，简介落到图片下沿 */
.marquee-meta {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-self: stretch;
  height: 56px;
  min-width: 0;
  text-align: left;
}
.marquee-name {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.5px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.marquee-intro {
  font-size: 12px;
  line-height: 1.3;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (prefers-reduced-motion: reduce) {
  /* 关动画：改成可手动横拉，内容一样能看全 */
  .marquee-track {
    animation: none;
  }
  .marquee-band {
    overflow-x: auto;
  }
}
</style>

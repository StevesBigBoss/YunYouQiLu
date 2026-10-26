<script setup lang="ts">
import { LANDING_STRIP } from '../../config/landingStrip'
import { t, tv } from '../../config/i18n'

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

const strip = shuffle(LANDING_STRIP)
const base = import.meta.env.BASE_URL
</script>

<template>
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

.marquee-band {
  position: relative;
  overflow: hidden;
  padding: 6px 0;
  background: transparent;
  -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 3.5%, #000 96.5%, transparent 100%);
  mask-image: linear-gradient(90deg, transparent 0, #000 3.5%, #000 96.5%, transparent 100%);
}

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
  .marquee-track {
    animation: none;
  }
  .marquee-band {
    overflow-x: auto;
  }
}
</style>

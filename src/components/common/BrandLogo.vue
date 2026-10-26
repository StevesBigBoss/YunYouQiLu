<script setup lang="ts">
import { t } from '../../config/i18n'

withDefaults(
  defineProps<{
    size?: number
    label?: string
  }>(),
  { size: 28, label: '云游齐鲁' },
)
</script>

<template>
  <span class="brand-logo" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg viewBox="0 0 32 32" role="img" :aria-label="t(label)">
      <circle class="bl-sun" cx="22.4" cy="10" r="4" />
      <path class="bl-peak-main" d="M5.6 23.6L12 9.4L18.4 23.6Z" />
      <path class="bl-peak-side" d="M16.8 23.6L21.6 13.8L26.4 23.6Z" />
      <path class="bl-water" d="M5.2 26.2q3.3-1.6 6.6 0t6.6 0t6.6 0" />
    </svg>
  </span>
</template>

<style scoped>
.brand-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 27%;
  background: linear-gradient(
    135deg,
    var(--logo-accent-light, #2BD97C) 0%,
    var(--logo-accent-deep, #00A052) 100%
  );
  box-shadow:
    0 2px 6px rgba(0, 120, 64, 0.28),
    inset 0 0 0 1px rgba(255, 255, 255, 0.38);
}
.brand-logo svg {
  display: block;
  width: 100%;
  height: 100%;
}
.bl-sun {
  fill: #F2FFF7;
}
.bl-peak-main {
  fill: #FFFFFF;
}
.bl-peak-side {
  fill: #FFFFFF;
  fill-opacity: 0.88;
}
.bl-water {
  fill: none;
  stroke: #FFFFFF;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.85;
}
</style>

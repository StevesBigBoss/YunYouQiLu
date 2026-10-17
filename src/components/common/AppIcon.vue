<script setup lang="ts">
import { computed } from 'vue'
import { ICONS } from '../../config/icons'

/** 全站统一图标：名称取自 config/icons.ts 的自绘图库 */
const props = withDefaults(defineProps<{ name: string; size?: number }>(), { size: 16 })

const prims = computed(() => ICONS[props.name] ?? [])
</script>

<template>
  <svg
    class="app-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <component :is="p.tag" v-for="(p, i) in prims" :key="i" v-bind="p.attrs" />
  </svg>
</template>

<style scoped>
.app-icon {
  flex-shrink: 0;
  display: inline-block;
  vertical-align: -0.14em;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.85;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>

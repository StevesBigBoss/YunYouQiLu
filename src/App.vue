<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import PageLayout from './components/common/PageLayout.vue'
import ImageZoomHost from './components/common/ImageZoomHost.vue'
import { currentThemeId } from './config/appTheme'

const route = useRoute()

/** 首页与登录页是整屏页面（meta.bare），不套左侧导航；其余页面套载侧栏 + 顶栏的框架 */
const isBarePage = computed(() => route.meta.bare === true)
</script>

<template>
  <!-- 仿 Modrinth 的整屏首页 / 登录页 -->
  <router-view v-if="isBarePage" />
  <PageLayout v-else>
    <!-- 换风格时重挂载页面：Leaflet 图层与 ECharts 实例按新色板重建 -->
    <router-view :key="currentThemeId" />
  </PageLayout>

  <!-- 全局图片放大：双击任意页面上任意图片，用灯箱展开放大（含整屏的首页/登录页） -->
  <ImageZoomHost />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import PageLayout from './components/common/PageLayout.vue'
import ImageZoomHost from './components/common/ImageZoomHost.vue'
import { currentThemeId } from './config/appTheme'

const route = useRoute()

const isBarePage = computed(() => route.meta.bare === true)
</script>

<template>
  <router-view v-if="isBarePage" />
  <PageLayout v-else>
    <router-view :key="currentThemeId" />
  </PageLayout>

  <ImageZoomHost />
</template>

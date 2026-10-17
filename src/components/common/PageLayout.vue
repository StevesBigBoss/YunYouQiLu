<template>
  <div class="page-layout" :class="{ collapsed: isCollapsed }">
    <!-- 左侧导航 -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <BrandLogo :size="28" />
        <span v-if="!isCollapsed" class="logo-text">{{ t('云游齐鲁') }}</span>
      </div>
      <nav class="nav-menu">
        <template v-for="item in menuItems" :key="item.path">
          <!-- 无子菜单 -->
          <div
            v-if="!item.children"
            class="nav-item"
            :class="{ active: isActive(item.path) }"
            @click="navigate(item.path)"
          >
            <AppIcon :name="item.icon" :size="17" />
            <span v-if="!isCollapsed" class="nav-text">{{ t(item.title) }}</span>
          </div>
          <!-- 有子菜单 -->
          <div v-else>
            <div
              class="nav-item"
              :class="{ active: isParentActive(item.path), expanded: expandedMenus.includes(item.path) }"
              @click="openParent(item.path)"
            >
              <AppIcon :name="item.icon" :size="17" />
              <span v-if="!isCollapsed" class="nav-text">{{ t(item.title) }}</span>
              <span v-if="!isCollapsed" class="nav-arrow"><AppIcon name="chevron" :size="12" /></span>
            </div>
            <div v-show="expandedMenus.includes(item.path) && !isCollapsed" class="submenu">
              <div
                v-for="child in item.children"
                :key="child.path"
                class="submenu-item"
                :class="{ active: isActive(child.path) }"
                @click="navigate(child.path)"
              >
                {{ t(child.title) }}
              </div>
            </div>
          </div>
        </template>
      </nav>
      <div class="sidebar-footer" @click="isCollapsed = !isCollapsed">
        <AppIcon :name="isCollapsed ? 'chevrons-right' : 'chevrons-left'" :size="14" />
        <span v-if="!isCollapsed">{{ t('折叠导航') }}</span>
      </div>
    </aside>

    <!-- 主区域 -->
    <div class="main-area">
      <!-- 顶栏 -->
      <header class="topbar">
        <div class="topbar-left">
          <span class="platform-title" :title="t('“云游齐鲁”山东沿黄文旅数智传播平台')">
            {{ t('“云游齐鲁”山东沿黄文旅数智传播平台') }}
          </span>
        </div>
        <!-- 全局分析范围：整机模块级筛选，首页与左侧功能区所有页面都按它重算 -->
        <CityScopeBar class="topbar-scope" />
        <div class="topbar-right">
          <span class="update-time">{{ t('数据更新：{time}', { time: updateTime }) }}</span>
          <LanguageSwitcher />
          <ThemeSwitcher />
          <UserMenu />
        </div>
      </header>

      <!-- 内容区 -->
      <main class="content-area">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BrandLogo from './BrandLogo.vue'
import AppIcon from './AppIcon.vue'
import LanguageSwitcher from './LanguageSwitcher.vue'
import ThemeSwitcher from './ThemeSwitcher.vue'
import UserMenu from './UserMenu.vue'
import CityScopeBar from './CityScopeBar.vue'
import { t } from '../../config/i18n'

const route = useRoute()
const router = useRouter()

const isCollapsed = ref(false)
const expandedMenus = ref<string[]>(['/opinion'])

const updateTime = computed(() => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
})

interface MenuChild { path: string; title: string }
interface MenuItem { path: string; title: string; icon: string; children?: MenuChild[] }

// 菜单顺序：首页（数据大屏）→ 旅游景点图 → 饮食文化 → 齐鲁文化遗产数字化，其余按原顺序排在其后
const menuItems: MenuItem[] = [
  { path: '/dashboard', title: '首页', icon: 'home' },
  { path: '/scenic', title: '旅游景点图', icon: 'scenic' },
  { path: '/food', title: '饮食文化', icon: 'food' },
  { path: '/heritage', title: '齐鲁文化遗产数字化', icon: 'heritage' },
  { path: '/nature', title: '自然环境保护区图', icon: 'leaf' },
  { path: '/flow', title: '客流监测与预警', icon: 'flow' },
  { path: '/industry', title: '文旅产业分析', icon: 'industry' },
  { path: '/resource', title: '文旅资源管理', icon: 'resource' },
  {
    path: '/opinion', title: '生态环境治理舆情分析', icon: 'opinion',
    children: [
      { path: '/opinion/topic', title: '热门话题' },
      { path: '/opinion/analyze', title: '舆情分析' },
      { path: '/opinion/wordcloud', title: '评论词云' },
      { path: '/opinion/heat', title: '评论热力' },
    ],
  },
  { path: '/marketing', title: '智慧营销与新媒体矩阵', icon: 'marketing' },
  { path: '/disaster', title: '灾难监控和预测', icon: 'disaster' },
]

function isActive(path: string) {
  return route.path === path
}

function isParentActive(path: string) {
  return route.path.startsWith(path)
}

function navigate(path: string) {
  router.push(path)
}

/* 带子菜单的父项：点一下既进它的总览页，也把子菜单展开（不然只展开不跳转，像点了没反应） */
function openParent(path: string) {
  if (!expandedMenus.value.includes(path)) expandedMenus.value.push(path)
  navigate(path)
}
</script>

<style scoped>
.page-layout {
  display: flex;
  width: 100%;
  height: 100%;
}

/* 侧边栏 */
.sidebar {
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  transition: width 0.3s, min-width 0.3s;
  overflow: hidden;
}
.page-layout.collapsed .sidebar {
  width: var(--sidebar-collapsed-width);
  min-width: var(--sidebar-collapsed-width);
}

.sidebar-header {
  height: var(--topbar-height);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}
.logo-text {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-gold);
  white-space: nowrap;
}

.nav-menu {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s;
  white-space: nowrap;
  gap: 10px;
}
.nav-item:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
}
.nav-item.active {
  background: linear-gradient(90deg, rgba(var(--rgb-gold), 0.15) 0%, transparent 100%);
  color: var(--text-gold);
  border-right: 3px solid var(--color-gold);
}
/* 折叠态只剩图标，居中排布 */
.page-layout.collapsed .nav-item { justify-content: center; gap: 0; padding-left: 0; padding-right: 0; }
/* 中文菜单项最多 9 个字，一行放得下；英俄等语言长得多，允许折成两行，
   避免 220px 的侧栏出现横向滚动条（条目高度自己会长，导航区照旧可滚动） */
.nav-text { flex: 1; font-size: 13px; line-height: 1.35; white-space: normal; }
.nav-arrow {
  display: inline-flex;
  color: var(--text-muted);
  transition: transform 0.2s;
}
.nav-item.expanded .nav-arrow { transform: rotate(90deg); }

.submenu {
  background: var(--submenu-bg);
}
.submenu-item {
  padding: 8px 16px 8px 48px;
  font-size: 12px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
}
.submenu-item:hover { color: var(--text-primary); background: var(--bg-card-hover); }
.submenu-item.active { color: var(--text-gold); background: rgba(var(--rgb-gold), 0.1); }

.sidebar-footer {
  padding: 10px 16px;
  border-top: 1px solid var(--border-color);
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.sidebar-footer:hover { color: var(--text-gold); }

/* 主区域 */
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 顶栏 */
.topbar {
  height: var(--topbar-height);
  background: var(--bg-topbar);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 20px;
  flex-shrink: 0;
}
.topbar-left { flex: 0 1 auto; min-width: 0; }
/* 范围筛选器居中：左右 auto 边距把剩余空间平分 */
.topbar-scope { margin: 0 auto; }
/* 平台名各语言长短差很多（俄语、阿拉伯语尤其长），一行显示、放不下就省略号，
   不让它把右侧的语言/风格/账号按钮挤出屏幕 */
.platform-title {
  display: block;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 17px;
  font-weight: 700;
  background: var(--gradient-gold);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
/* 顶栏去掉全局搜索后只剩品牌名与右侧工具组，右侧靠 auto 外边距顶到最右 */
.topbar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}
.update-time { font-size: 12px; color: var(--text-muted); }

/* 内容区 */
.content-area {
  flex: 1;
  overflow: auto;
  padding: 16px;
}
</style>

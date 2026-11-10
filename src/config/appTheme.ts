import { ref } from 'vue'
import { registerChartTheme } from './theme'

export interface AppThemeMeta {
  id: string
  name: string
  desc: string
  swatches: [string, string, string, string]
  dark: boolean
}

export const APP_THEMES: AppThemeMeta[] = [
  {
    id: 'cream',
    name: '默认清爽浅绿',
    desc: '亮绿点睛 · 浅灰留白',
    swatches: ['#00AF5C', '#00BD3C', '#F1F3F1', '#2C2E31'],
    dark: false,
  },
  {
    id: 'bluewhite',
    name: '简约蓝白色',
    desc: '冷调蓝白 · 清爽通透',
    swatches: ['#2B6CB0', '#3FA9C9', '#F3F8FD', '#22344A'],
    dark: false,
  },
  {
    id: 'cyber',
    name: '赛博炫彩',
    desc: '霓虹紫青 · 高对比',
    swatches: ['#22D3EE', '#7C3AED', '#090B1A', '#E6F7FF'],
    dark: true,
  },
]

export const DEFAULT_THEME_ID = 'cream'

const STORAGE_KEY = 'sd-map-theme'
const THEME_IDS = APP_THEMES.map((item) => item.id)

export const currentThemeId = ref<string>(DEFAULT_THEME_ID)

export function findAppTheme(id: string): AppThemeMeta {
  return APP_THEMES.find((item) => item.id === id) ?? APP_THEMES[0]
}

function readStoredThemeId(): string {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved && THEME_IDS.includes(saved)) return saved
  } catch {
  }
  return DEFAULT_THEME_ID
}

export function applyAppTheme(id: string) {
  const themeId = THEME_IDS.includes(id) ? id : DEFAULT_THEME_ID
  currentThemeId.value = themeId
  document.documentElement.dataset.theme = themeId
  try {
    window.localStorage.setItem(STORAGE_KEY, themeId)
  } catch {
  }
  registerChartTheme(themeId)
}

export function initAppTheme() {
  applyAppTheme(readStoredThemeId())
}

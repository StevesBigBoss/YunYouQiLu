import { ref } from 'vue'
import { registerChartTheme } from './theme'

export interface AppThemeMeta {
  id: string
  /** 切换面板里显示的风格名 */
  name: string
  desc: string
  /** 色卡预览：主色 / 辅色 / 底色 / 文字色 */
  swatches: [string, string, string, string]
  dark: boolean
}

/** 六套风格，:root（style.css）与 id=cream 保持一致 */
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
    id: 'hellokitty',
    name: 'Hello Kitty',
    desc: '粉嫩甜心 · 圆润可爱',
    swatches: ['#F06292', '#FF9EB5', '#FFF6F9', '#5A3A45'],
    dark: false,
  },
  {
    id: 'night',
    name: '夜晚科技',
    desc: '深蓝夜幕 · 金色数据',
    swatches: ['#C8A45C', '#3A7BD5', '#0A1628', '#E8EDF5'],
    dark: true,
  },
  {
    id: 'cyber',
    name: '赛博炫彩',
    desc: '霓虹紫青 · 高对比',
    swatches: ['#22D3EE', '#7C3AED', '#090B1A', '#E6F7FF'],
    dark: true,
  },
  {
    id: 'eyecare',
    name: '夜晚护眼色',
    desc: '墨绿柔光 · 低刺激',
    swatches: ['#D9A13B', '#6FA07C', '#111C18', '#DCE6DC'],
    dark: true,
  },
]

export const DEFAULT_THEME_ID = 'cream'

const STORAGE_KEY = 'sd-map-theme'
const THEME_IDS = APP_THEMES.map((item) => item.id)

/** 当前风格 id；页面按它换 key 重挂载，让地图与图表按新色板重绘 */
export const currentThemeId = ref<string>(DEFAULT_THEME_ID)

export function findAppTheme(id: string): AppThemeMeta {
  return APP_THEMES.find((item) => item.id === id) ?? APP_THEMES[0]
}

function readStoredThemeId(): string {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved && THEME_IDS.includes(saved)) return saved
  } catch {
    // 隐私模式等场景下 localStorage 不可用，直接用默认风格
  }
  return DEFAULT_THEME_ID
}

/** 应用风格：写入 <html data-theme>（CSS 变量随之切换）、持久化，并按新色板重注册图表主题 */
export function applyAppTheme(id: string) {
  const themeId = THEME_IDS.includes(id) ? id : DEFAULT_THEME_ID
  currentThemeId.value = themeId
  document.documentElement.dataset.theme = themeId
  try {
    window.localStorage.setItem(STORAGE_KEY, themeId)
  } catch {
    // 存不下也不影响本次切换
  }
  registerChartTheme(themeId)
}

/** 启动时应用上次选择的风格 */
export function initAppTheme() {
  applyAppTheme(readStoredThemeId())
}

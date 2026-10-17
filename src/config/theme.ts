import * as echarts from 'echarts'

/** 图表统一使用的 ECharts 主题名，风格切换时按新色板重新注册 */
export const CHART_THEME_NAME = 'appTheme'

export interface ChartPalette {
  /** 系列配色（柱/线/饼循环取色） */
  colors: string[]
  text: string
  title: string
  subtext: string
  legend: string
  tooltipBg: string
  tooltipBorder: string
  tooltipText: string
  axisLine: string
  splitLine: string
  axisLabel: string
  /** 饼图/环形图的分隔描边色，跟随卡片底色 */
  pieBorder: string
}

const PALETTES: Record<string, ChartPalette> = {
  // 默认清爽浅绿
  cream: {
    colors: ['#00AF5C', '#3A7BD5', '#E8A838', '#00BD3C', '#4CD08A', '#D94F4F', '#8E7CC3', '#5BA3D9', '#E07B39', '#2FC57E'],
    text: '#3A3F45',
    title: '#2C2E31',
    subtext: '#7D838A',
    legend: '#484D54',
    tooltipBg: 'rgba(255, 255, 255, 0.96)',
    tooltipBorder: '#DFE3DF',
    tooltipText: '#2C2E31',
    axisLine: '#D0D5D0',
    splitLine: '#EEF1EE',
    axisLabel: '#484D54',
    pieBorder: '#FFFFFF',
  },
  // 简约蓝白色
  bluewhite: {
    colors: ['#2B6CB0', '#3FA9C9', '#4C86D9', '#1F8A8A', '#5B7FD9', '#2E9E7E', '#7AA5E0', '#38B2C9', '#6C8FD6', '#4FB3A0'],
    text: '#33475B',
    title: '#22344A',
    subtext: '#7A8FA6',
    legend: '#5A6E85',
    tooltipBg: 'rgba(255, 255, 255, 0.96)',
    tooltipBorder: '#CFE0F0',
    tooltipText: '#22344A',
    axisLine: '#C7D8E8',
    splitLine: '#E4EEF7',
    axisLabel: '#5A6E85',
    pieBorder: '#FFFFFF',
  },
  // Hello Kitty 粉
  hellokitty: {
    colors: ['#F06292', '#FF9EB5', '#FFB74D', '#B39DDB', '#4DD0E1', '#F48FB1', '#AED581', '#FF8A65', '#90CAF9', '#CE93D8'],
    text: '#6B4A55',
    title: '#5A3A45',
    subtext: '#A9828E',
    legend: '#8A6172',
    tooltipBg: 'rgba(255, 247, 250, 0.97)',
    tooltipBorder: '#F8CADA',
    tooltipText: '#5A3A45',
    axisLine: '#F3CFDC',
    splitLine: '#FCE7EF',
    axisLabel: '#8A6172',
    pieBorder: '#FFFFFF',
  },
  // 夜晚科技
  night: {
    colors: ['#C8A45C', '#4CAF7D', '#3A7BD5', '#E8A838', '#5BA3D9', '#D94F4F', '#8E7CC3', '#6BC5A0', '#E07B39', '#4A90D9'],
    text: '#DCE6F5',
    title: '#E8EDF5',
    subtext: '#8FA3BF',
    legend: '#8FA3BF',
    tooltipBg: 'rgba(15, 31, 56, 0.95)',
    tooltipBorder: '#2A4A6F',
    tooltipText: '#E8EDF5',
    axisLine: '#2A4A6F',
    splitLine: '#1B3557',
    axisLabel: '#8FA3BF',
    pieBorder: '#0F1F38',
  },
  // 赛博炫彩
  cyber: {
    colors: ['#22D3EE', '#7C3AED', '#F472B6', '#38BDF8', '#A3E635', '#FBBF24', '#E879F9', '#2DD4BF', '#818CF8', '#FB7185'],
    text: '#D6E4FF',
    title: '#E6F7FF',
    subtext: '#8B9BD6',
    legend: '#8B9BD6',
    tooltipBg: 'rgba(12, 16, 40, 0.95)',
    tooltipBorder: '#3B2A78',
    tooltipText: '#E6F7FF',
    axisLine: '#35306B',
    splitLine: '#201C46',
    axisLabel: '#8B9BD6',
    pieBorder: '#090B1A',
  },
  // 夜晚护眼色
  eyecare: {
    colors: ['#D9A13B', '#6FA07C', '#7BA7C9', '#C9A227', '#8FBF9F', '#C97F6B', '#A8A0D0', '#7FBFA8', '#C99A5B', '#9BBF8F'],
    text: '#C9D6C9',
    title: '#DCE6DC',
    subtext: '#8FA394',
    legend: '#8FA394',
    tooltipBg: 'rgba(24, 38, 32, 0.95)',
    tooltipBorder: '#35463C',
    tooltipText: '#DCE6DC',
    axisLine: '#33443A',
    splitLine: '#22302A',
    axisLabel: '#8FA394',
    pieBorder: '#16211C',
  },
}

let active = PALETTES.cream

/** 按当前风格注册（覆盖）ECharts 主题；切换风格后页面重建，图表会读到这里的新色板 */
export function registerChartTheme(themeId: string) {
  active = PALETTES[themeId] ?? PALETTES.cream
  echarts.registerTheme(CHART_THEME_NAME, {
    color: active.colors,
    backgroundColor: 'transparent',
    textStyle: {
      color: active.text,
      fontFamily: "'Microsoft YaHei', 'PingFang SC', sans-serif",
    },
    title: {
      textStyle: { color: active.title },
      subtextStyle: { color: active.subtext },
    },
    legend: {
      textStyle: { color: active.legend },
    },
    tooltip: {
      backgroundColor: active.tooltipBg,
      borderColor: active.tooltipBorder,
      textStyle: { color: active.tooltipText },
    },
    categoryAxis: {
      axisLine: { lineStyle: { color: active.axisLine } },
      axisTick: { lineStyle: { color: active.axisLine } },
      axisLabel: { color: active.axisLabel },
      splitLine: { lineStyle: { color: active.splitLine } },
    },
    valueAxis: {
      axisLine: { lineStyle: { color: active.axisLine } },
      axisTick: { lineStyle: { color: active.axisLine } },
      axisLabel: { color: active.axisLabel },
      splitLine: { lineStyle: { color: active.splitLine } },
    },
    line: {
      itemStyle: { borderWidth: 2 },
      lineStyle: { width: 2 },
      symbolSize: 6,
      smooth: true,
    },
    bar: {
      itemStyle: { borderRadius: [4, 4, 0, 0] },
    },
    pie: {
      itemStyle: {
        borderColor: active.pieBorder,
        borderWidth: 2,
      },
    },
  })
}

/** 当前风格的图表配色，供词云等自行上色的地方取用 */
export function themeColors(): string[] {
  return active.colors
}

/**
 * 当前风格的主强调色（= 色板第一个颜色，与 CSS 的 --color-gold 同色）。
 * ECharts / Leaflet 在 canvas、SVG 上作画，读不到 CSS 变量，这些地方统一从这里取色。
 */
export function themeAccent(): string {
  return active.colors[0]
}

/** 主强调色的半透明版本，用于面积填充、浅底徽标等 */
export function themeAccentAlpha(alpha: number): string {
  const hex = active.colors[0].replace('#', '')
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** 当前风格的标题 / 饼图与桑基图标签文字色 */
export function themeTitle(): string {
  return active.title
}

/** 当前风格的图例文字色 */
export function themeLegend(): string {
  return active.legend
}

/** 默认（米白）色板，作为不依赖当前风格时的兜底 */
export const THEME_COLORS = PALETTES.cream.colors

export { echarts }

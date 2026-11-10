import * as echarts from 'echarts'

export const CHART_THEME_NAME = 'appTheme'

export interface ChartPalette {
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
  pieBorder: string
}

const PALETTES: Record<string, ChartPalette> = {
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
}

let active = PALETTES.cream

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

export function themeColors(): string[] {
  return active.colors
}

export function themeAccent(): string {
  return active.colors[0]
}

export function themeAccentAlpha(alpha: number): string {
  const hex = active.colors[0].replace('#', '')
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function themeTitle(): string {
  return active.title
}

export function themeLegend(): string {
  return active.legend
}

export const THEME_COLORS = PALETTES.cream.colors

export { echarts }

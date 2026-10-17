<template>
  <div class="nature-page">
    <!-- 左侧地图 70%：各市自然保护区数量热力图 -->
    <div class="map-side">
      <CityChoropleth
        :data="choroplethData"
        :unit="t('处')"
        :value-label="t('保护区数量')"
        :legend-title="t('各市自然保护区数量（处）')"
        :headline-title="t('自然保护区地图 · {scope}', { scope: scopeLabel })"
        :headline-sub="t('全国底图 · 聚焦山东 · 各市自然保护区数量热力 + 保护区叶形标（按等级着色）与物种监测点；点叶形标看保护区详情，单击地市切换分析范围并细分县区')"
        :point-groups="natureGroups"
        @select="onSelectCity"
        @point-select="onPointSelect"
      >
        <!-- 图例里点上本页的点位说明：叶形标 = 保护区，圆环 = 物种监测点（等级色见右上「图层」） -->
        <template #legend-extra>
          <div class="map-mark-legend">
            <span class="map-mark-title">{{ t('叶形标 = 保护区（按等级着色）；圆环 = 物种监测点（与保护区同址布设，按物种等级着色）') }}</span>
          </div>
        </template>
      </CityChoropleth>
    </div>

    <!-- 右侧数据面板 30% -->
    <div class="panel-side">
      <div class="panel-scroll">
        <!-- 顶部统计 -->
        <div class="stat-row">
          <div class="stat-mini">
            <div class="stat-mini-value gold">{{ totalReserves }}</div>
            <div class="stat-mini-label">{{ t('保护区总数（处）· {scope}', { scope: scopeLabel }) }}</div>
          </div>
          <div class="stat-mini">
            <div class="stat-mini-value gold">{{ totalNational }}</div>
            <div class="stat-mini-label">{{ t('国家级保护区（处）') }}</div>
          </div>
        </div>

        <!-- 选中地市概况 -->
        <div v-if="selectedCity" class="common-card">
          <div class="card-title">
            {{ t('{city} · 保护区概况', { city: shortCity(selectedCity) }) }}
            <span class="close-detail" :title="t('关闭')" @click="selectedCity = ''"><AppIcon name="close" :size="12" /></span>
          </div>
          <div class="detail-row"><span>{{ t('保护区数量') }}</span>
            <b>{{ t('{n} 处', { n: selectedStat?.total ?? 0 }) }}</b>
          </div>
          <div class="detail-row"><span>{{ t('国家级') }}</span><span>{{ t('{n} 处', { n: selectedStat?.national ?? 0 }) }}</span></div>
          <div class="detail-row"><span>{{ t('省级') }}</span><span>{{ t('{n} 处', { n: selectedStat?.provincial ?? 0 }) }}</span></div>
          <div class="detail-row"><span>{{ t('市县级') }}</span><span>{{ t('{n} 处', { n: selectedStat?.county ?? 0 }) }}</span></div>
          <div class="sub-title">{{ t('县区分布（按市级总量折算）') }}</div>
          <table class="common-table">
            <thead>
              <tr><th>{{ t('县区') }}</th><th>{{ t('保护区（处）') }}</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in countyReserveRows" :key="row.name">
                <td>{{ tv(row.name) }}</td>
                <td>{{ row.value }}</td>
              </tr>
            </tbody>
          </table>
          <div class="sub-title">{{ t('重点监测保护区（{n}）', { n: cityReserves.length }) }}</div>
          <div
            v-for="r in cityReserves"
            :key="r.id"
            class="monitor-item"
            @click="selectedReserve = r"
          >
            <span class="monitor-name">{{ tv(r.name) }}</span>
            <span class="tag" :class="r.level === '国家级' ? 'tag-gold' : 'tag-green'">{{ t(r.level) }}</span>
          </div>
          <div v-if="!cityReserves.length" class="monitor-empty">{{ t('该市暂无接入监测的重点保护区') }}</div>
        </div>

        <!-- 选中保护区详情 -->
        <div v-if="selectedReserve" class="common-card detail-card">
          <div class="card-title">
            {{ t('保护区详情') }}
            <span class="close-detail" :title="t('关闭')" @click="selectedReserve = null"><AppIcon name="close" :size="12" /></span>
          </div>
          <div class="detail-name">{{ tv(selectedReserve.name) }}</div>
          <div class="detail-row"><span>{{ t('等级') }}</span>
            <span class="tag" :class="selectedReserve.level === '国家级' ? 'tag-gold' : 'tag-green'">{{ t(selectedReserve.level) }}</span>
          </div>
          <div class="detail-row"><span>{{ t('所属地市') }}</span><span>{{ tv(selectedReserve.city) }}</span></div>
          <div class="detail-row"><span>{{ t('面积') }}</span><b>{{ t('{n} 公顷', { n: formatNum(selectedReserve.area) }) }}</b></div>
          <div class="detail-row"><span>{{ t('保护对象') }}</span>
            <span>{{ tv(selectedReserve.species.join('、')) }}</span>
          </div>
          <div class="detail-row"><span>{{ t('管理机构') }}</span><span>{{ tv(selectedReserve.manager) }}</span></div>
          <div class="detail-row"><span>{{ t('最近监测') }}</span><b>{{ tv(selectedReserve.lastMonitor) }}</b></div>
        </div>

        <!-- 等级分布饼图 -->
        <ChartCard :title="t('保护区等级分布')" :option="pieOption" height="220px" />

        <!-- 重点保护物种 -->
        <div class="common-card">
          <div class="card-title">{{ t('重点保护物种分布 · {scope}', { scope: scopeLabel }) }}</div>
          <table class="common-table">
            <thead>
              <tr><th>{{ t('物种') }}</th><th>{{ t('保护等级') }}</th></tr>
            </thead>
            <tbody>
              <tr v-for="s in speciesRows" :key="s.name">
                <td>{{ tv(s.name) }}</td>
                <td>
                  <span class="tag" :class="speciesTagClass(s.level)">{{ tv(s.level) }}</span>
                </td>
              </tr>
              <tr v-if="!speciesRows.length">
                <td colspan="2" class="monitor-empty">{{ t('当前范围暂未接入物种监测点位') }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 人类活动干扰 -->
        <div class="common-card">
          <div class="card-title">
            {{ t('人类活动干扰点位 · {scope}', { scope: scopeLabel }) }}
            <span class="tag tag-red">{{ t('与灾难监控联动') }}</span>
          </div>
          <div v-for="c in conflictRows" :key="c.id" class="conflict-item">
            <div class="conflict-name"><AppIcon name="warn" :size="13" /> {{ tv(c.name) }}</div>
            <div class="conflict-reason">{{ tv(c.reason) }}</div>
          </div>
          <div v-if="!conflictRows.length" class="monitor-empty">{{ t('当前范围内没有生态红线冲突点位') }}</div>
        </div>

        <!-- 保护区实景配图：点缩略图看大图 -->
        <ImageGallery page="nature" :title="t('保护区实景图集')" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CityChoropleth from '../components/common/CityChoropleth.vue'
import ChartCard from '../components/common/ChartCard.vue'
import ImageGallery from '../components/common/ImageGallery.vue'
import AppIcon from '../components/common/AppIcon.vue'
import {
  mockReserves, mockSpeciesPoints, mockConflictList, mockReserveCityStats, mockResourceList,
} from '../mock'
import { themeColors, themeTitle } from '../config/theme'
import { t, tv } from '../config/i18n'
import { CITY_COUNTIES } from '../config/cityCounties'
import { countyWeight, splitIntByWeight } from '../config/cityStats'
import { inScope, jitter, pointInScope, scopeCity, scopeLabel, stableJitter } from '../config/scopeData'
import type { CityCountItem, MapPointGroup, MapSpotPoint, NatureReserve, SpeciesPoint } from '../types'

const selectedCity = ref('')
const selectedReserve = ref<NatureReserve | null>(null)

/** 范围为具体城市时默认展开该市概况，省得再点地图 */
watch(scopeCity, (city) => {
  selectedCity.value = city ? `${city}市` : ''
}, { immediate: true })

// 各市统计：只保留当前范围内的市；范围 = 单市时其余市不着色
const scopeCityStats = computed(() => mockReserveCityStats.filter((c) => inScope(c.city)))

const totalReserves = computed(() => scopeCityStats.value.reduce((s, c) => s + c.total, 0))
const totalNational = computed(() => scopeCityStats.value.reduce((s, c) => s + c.national, 0))

const selectedStat = computed(() =>
  mockReserveCityStats.find((c) => c.city === selectedCity.value && inScope(c.city)),
)
const cityReserves = computed(() => mockReserves.filter((r) => r.city === selectedCity.value))

/** 选中市的县区分布：市级总量按县区权重折成整数（最大余数法，合计与市级总量一致），只保留 ≥1 处的县区 */
const countyReserveRows = computed(() => {
  const stat = selectedStat.value
  if (!stat) return []
  const short = selectedCity.value.replace(/市$/, '') as keyof typeof CITY_COUNTIES
  const counties = CITY_COUNTIES[short]
  if (!counties) return []
  const values = splitIntByWeight(stat.total, counties.map((c) => countyWeight(c.name)))
  return counties
    .map((c, i) => ({ name: c.name, value: values[i] }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
})

// 各市保护区数量：total 由国家级/省级/市县级构成，明细直接展示在提示框与弹窗中
const choroplethData = computed<CityCountItem[]>(() =>
  scopeCityStats.value.map((c) => ({
    city: c.city,
    value: c.total,
    tag: t('保护区数量'),
    rows: [
      { label: t('国家级'), value: t('{n} 处', { n: c.national }) },
      { label: t('省级'), value: t('{n} 处', { n: c.provincial }) },
      { label: t('市县级'), value: t('{n} 处', { n: c.county }) },
    ],
  })),
)

const pieOption = computed(() => {
  const sum = (key: 'national' | 'provincial' | 'county') =>
    scopeCityStats.value.reduce((s, c) => s + c[key], 0)
  return {
    tooltip: { trigger: 'item', formatter: t('{b}: {c} 处 ({d}%)') },
    legend: { bottom: 0 },
    // 这张卡只有 261×220，环一大外圈标注就放不下，ECharts 会直接不画（原先只剩"国家级"一个标注）。
    // 缩小环并把标注贴边距离从默认 25% 放到 2%，三个等级名才都能显示
    series: [{
      type: 'pie',
      radius: ['36%', '58%'],
      center: ['50%', '44%'],
      label: { color: themeTitle(), edgeDistance: '2%' },
      labelLine: { length: 6, length2: 10 },
      data: [
        { name: t('国家级'), value: sum('national'), itemStyle: { color: themeColors()[0] } },
        { name: t('省级'), value: sum('provincial'), itemStyle: { color: themeColors()[1] } },
        { name: t('市县级'), value: sum('county'), itemStyle: { color: themeColors()[2] } },
      ],
    }],
  }
})

/**
 * 重点保护物种：按坐标归属过滤；
 * 范围内没有点位（非沿黄城市居多）时，用该市保护区的保护对象补齐，等级按名称固定分档。
 */
const speciesRows = computed<SpeciesPoint[]>(() => {
  const inRange = mockSpeciesPoints.filter((s) => pointInScope(s.lng, s.lat))
  if (inRange.length) return inRange
  const city = scopeCity.value
  if (!city) return []
  const levels: SpeciesPoint['level'][] = ['国家一级', '国家二级', '国家三有']
  const names: string[] = []
  mockReserves
    .filter((r) => r.city === `${city}市`)
    .forEach((r) => r.species.forEach((s) => { if (!names.includes(s)) names.push(s) }))
  return names.slice(0, 8).map((name) => ({
    name,
    level: levels[Math.floor(jitter(`species-${name}`, 0.49) * 3) % 3],
    lng: 0,
    lat: 0,
  }))
})

/** 生态红线冲突点位：按资源点归属过滤 */
const conflictRows = computed(() =>
  mockConflictList.filter((c) => {
    const res = mockResourceList.find((r) => r.name === c.name || r.id === c.id)
    return res ? inScope(res.city) : true
  }),
)

function shortCity(name: string): string {
  return name.replace(/市$/, '')
}

function formatNum(n: number): string {
  return n.toLocaleString('zh-CN')
}

function speciesTagClass(level: string): string {
  if (level === '国家一级') return 'tag-red'
  if (level === '国家二级') return 'tag-orange'
  return 'tag-blue'
}

/** 保护区等级 → 色板色（与「保护区等级分布」饼图同色） */
function levelColor(level: string): string {
  const colors = themeColors()
  return level === '国家级' ? colors[0] : colors[1]
}

/** 物种保护等级 → 色板色：一级红、二级琥珀、三有蓝，与物种表的标签色对应 */
function speciesColor(level: string): string {
  const colors = themeColors()
  if (level === '国家一级') return colors[5]
  if (level === '国家二级') return colors[2]
  return colors[1]
}

/** 确定性错开：物种监测点就布在保护区旁，完全叠住会点不到 */
function dodged(id: string, lng: number, lat: number): { lng: number; lat: number } {
  return {
    lng: Number((lng + (stableJitter(`nature-dx-${id}`, 1) - 1) * 0.03).toFixed(4)),
    lat: Number((lat + (stableJitter(`nature-dy-${id}`, 1) - 1) * 0.03).toFixed(4)),
  }
}

/**
 * 地图点位分组：国家级 / 省级 / 物种监测点各占右上「图层」里的一行，可单独显隐（与灾难监控页同款）。
 * 保护区用叶形标（按等级上色）跟着分析范围走，与右侧「保护区总数」口径一致；
 * 物种点用右侧同一份清单（按坐标归属过滤），小圆环按保护等级上色。
 */
const natureGroups = computed<MapPointGroup[]>(() => {
  const reservesOf = (level: string): MapSpotPoint[] =>
    mockReserves
      .filter((r) => inScope(r.city) && r.level === level)
      .map((r) => ({
        ...dodged(r.id, r.lng, r.lat),
        id: r.id,
        name: r.name,
        tag: t(r.level),
        intro: t('主要保护对象：{list}', { list: r.species.join('、') }),
        rows: [
          { label: t('所属地市'), value: t(r.city) },
          { label: t('面积'), value: t('{n} 公顷', { n: formatNum(r.area) }) },
          { label: t('管理机构'), value: r.manager },
          { label: t('最近监测'), value: r.lastMonitor },
        ],
      }))
  // 由保护区保护对象补齐的行没有坐标（lng/lat = 0），只在右侧表格里出现，不上图
  const species: MapSpotPoint[] = speciesRows.value
    .filter((s) => s.lng || s.lat)
    .map((s) => ({
      ...dodged(`sp-${s.name}`, s.lng, s.lat),
      id: `species-${s.name}`,
      name: t('{name} · 监测点', { name: s.name }),
      tag: t(s.level),
      color: speciesColor(s.level),
      intro: t('重点保护物种监测点位（与保护区同址布设）'),
    }))
  const national = reservesOf('国家级')
  const provincial = reservesOf('省级')
  return [
    { key: 'nature-national', label: t('国家级保护区（{n} 处）', { n: national.length }), color: levelColor('国家级'), icon: 'leaf', points: national },
    { key: 'nature-provincial', label: t('省级保护区（{n} 处）', { n: provincial.length }), color: levelColor('省级'), icon: 'leaf', points: provincial },
    { key: 'nature-species', label: t('物种监测点（{n} 个）', { n: species.length }), color: 'var(--text-muted)', ring: true, points: species },
  ].filter((g) => g.points.length > 0)
})

/** 地图上点保护区标记：直接打开右侧保护区详情 */
function onPointSelect(id: string) {
  const r = mockReserves.find((item) => item.id === id)
  if (r) selectedReserve.value = r
}

function onSelectCity(city: string) {
  selectedCity.value = city
}
</script>

<style scoped>
.nature-page {
  display: flex;
  height: calc(100vh - 56px - 32px);
  gap: 12px;
}
.map-side {
  position: relative;
  flex: 7;
  min-width: 0;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
}
.panel-side {
  flex: 3;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.panel-scroll {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 4px;
}

.stat-row {
  display: flex;
  gap: 12px;
}
.stat-mini {
  flex: 1;
  min-width: 0;
  background: var(--gradient-card);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 14px;
  text-align: center;
}
.stat-mini-value {
  font-size: 22px;
  font-weight: 700;
  font-family: 'DIN', sans-serif;
}
.stat-mini-value.gold { color: var(--text-gold); }
.stat-mini-label { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }

.close-detail {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 14px;
}
.close-detail:hover { color: var(--text-gold); }
.detail-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-gold);
  margin-bottom: 10px;
}
.detail-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  color: var(--text-secondary);
  padding: 6px 0;
  border-bottom: 1px dashed var(--border-color);
}
.detail-row span:last-child { color: var(--text-primary); text-align: right; flex: 1; }

.sub-title {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 10px 0 6px;
  padding-left: 8px;
  border-left: 3px solid var(--color-gold);
}
.monitor-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}
.monitor-item:hover { background: var(--bg-card-hover); }
.monitor-name {
  font-size: 12px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.monitor-empty { font-size: 12px; color: var(--text-muted); padding: 4px 0; }

.conflict-item {
  padding: 10px;
  background: rgba(217, 79, 79, 0.06);
  border: 1px solid rgba(217, 79, 79, 0.25);
  border-radius: 4px;
  margin-bottom: 8px;
}
.conflict-item:last-child { margin-bottom: 0; }
.conflict-name {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--text-primary);
  margin-bottom: 4px;
}
.conflict-reason { font-size: 12px; color: var(--text-secondary); line-height: 1.5; }
</style>

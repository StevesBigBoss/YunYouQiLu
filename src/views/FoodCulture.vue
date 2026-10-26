<template>
  <div class="food-page">
    <div class="map-side">
      <CityChoropleth
        :data="choroplethData"
        :unit="t('项')"
        :value-label="t('收录美食')"
        color-mode="categorical"
        :legend-title="t('各市饮食文化收录（项）')"
        :headline-title="t('饮食文化地图 · {scope}', { scope: scopeLabel })"
        :headline-sub="t('全国底图 · 聚焦山东 · 各市按固定彩色区分、五颜六色（颜色只作区分，范围外地市灰显，数量见图上数字）+ 收录美食碗形标（按类别着色）；点碗形标定位到所属县区，单击地市切换分析范围并细分县区')"
        :focus="focusTarget"
        :point-groups="foodGroups"
        @select="onSelectCity"
        @point-select="onPointSelect"
      >
        <template #legend-extra>
          <div class="map-mark-legend">
            <span class="map-mark-title">{{ t('碗形标 = 收录美食（按类别着色）；点标记定位到所属县区') }}</span>
          </div>
        </template>
      </CityChoropleth>
    </div>

    <div class="panel-side">
      <div class="panel-scroll">
        <div class="stat-row">
          <div class="stat-mini">
            <div class="stat-mini-head">
              <AppIcon name="food" :size="15" />
              <span class="stat-mini-value gold">{{ filtered.length }}</span>
            </div>
            <div class="stat-mini-label">{{ t('收录美食（项）· {scope}', { scope: scopeLabel }) }}</div>
          </div>
          <div class="stat-mini">
            <div class="stat-mini-head">
              <AppIcon name="fire" :size="15" />
              <span class="stat-mini-value gold">{{ categoryCount('鲁菜名菜') }}</span>
            </div>
            <div class="stat-mini-label">{{ t('鲁菜名菜（道）') }}</div>
          </div>
          <div class="stat-mini">
            <div class="stat-mini-head">
              <AppIcon name="leaf" :size="15" />
              <span class="stat-mini-value gold">{{ categoryCount('地理标志') }}</span>
            </div>
            <div class="stat-mini-label">{{ t('地理标志（个）') }}</div>
          </div>
          <div class="stat-mini">
            <div class="stat-mini-head">
              <AppIcon name="heritage" :size="15" />
              <span class="stat-mini-value gold">{{ categoryCount('非遗美食') }}</span>
            </div>
            <div class="stat-mini-label">{{ t('非遗美食（项）') }}</div>
          </div>
        </div>

        <div class="common-card">
          <div class="food-filter">
            <button
              v-for="c in CATEGORIES"
              :key="c"
              class="cat-chip"
              :class="{ active: activeCategory === c }"
              @click="activeCategory = c"
            >
              {{ t(c) }}
            </button>
          </div>
          <input
            v-model="keyword"
            class="food-search"
            type="text"
            :placeholder="t('搜索美食 / 县区，如：火烧、单县')"
          />
        </div>

        <div v-if="selected" class="common-card detail-card">
          <div class="card-title">
            {{ t('美食详情') }}
            <span class="close-detail" :title="t('关闭')" @click="selected = null"><AppIcon name="close" :size="12" /></span>
          </div>
          <div class="detail-name">{{ tv(selected.name) }}</div>
          <div class="detail-row"><span>{{ t('类别') }}</span>
            <span class="tag" :class="categoryTag(selected.category)">{{ tv(selected.category) }}</span>
          </div>
          <div class="detail-row"><span>{{ t('所属地市') }}</span><span>{{ t('{city}市', { city: selected.city }) }}</span></div>
          <div class="detail-row"><span>{{ t('所属县区') }}</span><b>{{ tv(selected.county) }}</b></div>
          <div class="detail-row"><span>{{ t('风味特点') }}</span><span>{{ tv(selected.flavor) }}</span></div>
          <div class="sub-title">{{ t('代表吃法') }}</div>
          <div class="dish-tags">
            <span v-for="d in selected.dishes" :key="d" class="tag tag-green">{{ tv(d) }}</span>
          </div>
          <p class="food-desc">{{ tv(selected.desc) }}</p>
          <div v-if="selectedImage" class="food-figure">
            <img
              class="food-figure-img"
              :src="selectedImage.real"
              :alt="t('{name}配图', { name: selected.name })"
              :title="t('双击放大查看')"
              :data-zoom-caption="tv(selectedImage.caption)"
              :data-zoom-credit="tv(selectedImage.credit)"
              loading="lazy"
            />
            <div class="food-figure-foot">
              <span class="food-figure-cap">{{ tv(selectedImage.caption) }}</span>
              <span class="food-figure-credit">{{ tv(selectedImage.credit) }}</span>
            </div>
          </div>
          <button class="btn btn-primary locate-btn" @click="locateFood(selected)">
            <AppIcon name="pin" :size="13" /> {{ t('再次定位到 {county}', { county: selected.county }) }}
          </button>
        </div>

        <div class="common-card">
          <div class="card-title">
            {{ t('美食清单 · {scope}（{n}）', { scope: scopeLabel, n: filtered.length }) }}
            <span class="close-detail-hint">{{ t('点击定位县区') }}</span>
          </div>
          <div
            v-for="f in filtered"
            :key="f.id"
            class="food-item"
            :class="{ active: selected?.id === f.id }"
            @click="locateFood(f)"
          >
            <div class="food-item-main">
              <span class="food-name">{{ tv(f.name) }}</span>
              <span class="food-county"><AppIcon name="pin" :size="11" /> {{ tv(f.city) }} · {{ tv(f.county) }}</span>
            </div>
            <span class="tag" :class="categoryTag(f.category)">{{ tv(f.category) }}</span>
          </div>
          <div v-if="!filtered.length" class="monitor-empty">
            {{ t('当前范围「{scope}」下没有匹配的美食条目，可切换类别或清空搜索词。', { scope: scopeLabel }) }}
          </div>
        </div>

        <ChartCard :title="t('类别构成 · {scope}', { scope: scopeLabel })" :option="pieOption" height="230px" />
        <ChartCard :title="t('各市收录对比（前 8）· {scope}', { scope: scopeLabel })" :option="barOption" height="250px" />

        <div class="data-note">
          {{ t('清单为平台整理的山东饮食文化条目（鲁菜名菜 / 地方名吃 / 地理标志农产品 / 非遗美食），') }}
          {{ t('共 {n} 项；县区归属为名录口径，县区粒度暂无公开统计，故不参与数值折算。', { n: filtered.length }) }}
        </div>

        <ImageGallery page="food" :title="t('饮食文化图集')" />
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
import { mockFoodList } from '../mock'
import { FOOD_DISH_IMAGES, type FoodDishImage } from '../mock/foodDishImages'
import { inScope, scope, scopeLabel, stableJitter } from '../config/scopeData'
import { cityOfArea } from '../config/shandongRegions'
import type { ShandongCity } from '../config/shandongRegions'
import { CITY_COUNTIES } from '../config/cityCounties'
import { t, tv } from '../config/i18n'
import { themeColors, themeTitle } from '../config/theme'
import type { CityCountItem, FoodItem, MapPointGroup, MapSpotPoint } from '../types'

const CATEGORIES = ['全部', '鲁菜名菜', '地方名吃', '地理标志', '非遗美食'] as const

const activeCategory = ref<string>('全部')
const keyword = ref('')
const selected = ref<FoodItem | null>(null)
const focusTarget = ref<{ city: string; county: string; label?: string } | null>(null)

function shortCity(name: string): string {
  return name.replace(/市$/, '')
}

const scopeFoods = computed(() => mockFoodList.filter((f) => inScope(f.city)))

const filtered = computed(() => {
  const kw = keyword.value.trim()
  return scopeFoods.value.filter((f) => {
    if (activeCategory.value !== '全部' && f.category !== activeCategory.value) return false
    if (!kw) return true
    return `${f.name}${f.county}${f.city}${f.flavor}${f.dishes.join('')}`.includes(kw)
  })
})

const selectedImage = computed<FoodDishImage | null>(() =>
  selected.value ? FOOD_DISH_IMAGES[selected.value.id] ?? null : null,
)

function categoryCount(category: string): number {
  return scopeFoods.value.filter((f) => f.category === category).length
}

function categoryTag(category: string): string {
  if (category === '鲁菜名菜') return 'tag-gold'
  if (category === '地方名吃') return 'tag-green'
  if (category === '地理标志') return 'tag-blue'
  return 'tag-orange'
}

const choroplethData = computed<CityCountItem[]>(() => {
  const counts = new Map<string, { total: number; byCategory: Map<string, number> }>()
  filtered.value.forEach((f) => {
    const entry = counts.get(f.city) ?? { total: 0, byCategory: new Map<string, number>() }
    entry.total += 1
    entry.byCategory.set(f.category, (entry.byCategory.get(f.category) ?? 0) + 1)
    counts.set(f.city, entry)
  })
  return [...counts.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([city, entry]) => ({
      city: `${city}市`,
      value: entry.total,
      tag: t('收录美食'),
      rows: [...entry.byCategory.entries()].map(([label, value]) => ({ label: t(label), value: t('{n} 项', { n: value }) })),
    }))
})

function locateFood(f: FoodItem) {
  selected.value = f
  focusTarget.value = { city: f.city, county: f.county, label: f.name }
}

function categoryColor(category: string): string {
  const colors = themeColors()
  const idx = CATEGORIES.indexOf(category as (typeof CATEGORIES)[number])
  return colors[Math.max(0, idx - 1) % colors.length]
}

const foodGroups = computed<MapPointGroup[]>(() =>
  CATEGORIES.slice(1).map((category) => {
    const points: MapSpotPoint[] = filtered.value
      .filter((f) => f.category === category)
      .flatMap((f) => {
        const center = (CITY_COUNTIES[f.city as ShandongCity] ?? []).find((c) => c.name === f.county)
        if (!center) return []
        return [{
          id: f.id,
          name: f.name,
          lng: Number((center.lng + (stableJitter(`food-dx-${f.id}`, 1) - 1) * 0.03).toFixed(4)),
          lat: Number((center.lat + (stableJitter(`food-dy-${f.id}`, 1) - 1) * 0.03).toFixed(4)),
          tag: f.category,
          intro: f.desc,
          rows: [
            { label: t('所属地市'), value: t('{city}市', { city: f.city }) },
            { label: t('所属县区'), value: tv(f.county) },
            { label: t('风味特点'), value: tv(f.flavor) },
          ],
        }]
      })
    return {
      key: `food-${category}`,
      label: t('{category}（{n} 项）', { category: t(category), n: points.length }),
      color: categoryColor(category),
      icon: 'food',
      points,
    }
  }).filter((g) => g.points.length > 0),
)

function onPointSelect(id: string) {
  const f = filtered.value.find((item) => item.id === id)
  if (f) locateFood(f)
}

function onSelectCity(name: string) {
  const city = cityOfArea(name)
  if (city && selected.value && selected.value.city !== city) selected.value = null
}

watch(scope, () => {
  selected.value = null
  focusTarget.value = null
})

const pieOption = computed<Record<string, unknown>>(() => {
  const colors = themeColors()
  const counts = CATEGORIES.slice(1).map((c) => ({ name: t(c), value: categoryCount(c) }))
  return {
    tooltip: { trigger: 'item', formatter: t('{b}: {c} 项 ({d}%)') },
    legend: { bottom: 0, textStyle: { color: themeTitle() } },
    series: [{
      type: 'pie',
      radius: ['34%', '56%'],
      center: ['50%', '44%'],
      label: { color: themeTitle(), edgeDistance: '2%' },
      labelLine: { length: 6, length2: 10 },
      data: counts.map((c, i) => ({ ...c, itemStyle: { color: colors[i % colors.length] } })),
    }],
  }
})

const barOption = computed<Record<string, unknown>>(() => {
  const rows = [...choroplethData.value].slice(0, 8).reverse()
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 56, right: 24, top: 12, bottom: 26 },
    xAxis: { type: 'value', name: t('项'), minInterval: 1 },
    yAxis: {
      type: 'category',
      data: rows.map((r) => tv(shortCity(r.city))),
      axisLabel: { fontSize: 11 },
    },
    series: [{
      type: 'bar',
      barWidth: 14,
      data: rows.map((r) => r.value),
      itemStyle: { color: themeColors()[0], borderRadius: [0, 4, 4, 0] },
    }],
  }
})
</script>

<style scoped>
.food-page {
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
  gap: 10px;
}
.stat-row > * { flex: 1; min-width: 0; }
.stat-mini-head {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--text-gold);
}
.stat-mini-label { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }

.food-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}
.cat-chip {
  padding: 3px 10px;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s;
}
.cat-chip:hover { color: var(--text-gold); border-color: var(--color-gold); }
.cat-chip.active {
  color: var(--on-accent);
  background: var(--color-gold);
  border-color: var(--color-gold);
}
.food-search {
  width: 100%;
  padding: 6px 10px;
  font-size: 12px;
  color: var(--text-primary);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  outline: none;
}
.food-search:focus { border-color: var(--color-gold); }

.detail-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-gold);
  margin-bottom: 8px;
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
.detail-row span:last-child,
.detail-row b { color: var(--text-primary); text-align: right; flex: 1; }
.sub-title {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 10px 0 6px;
  padding-left: 8px;
  border-left: 3px solid var(--color-gold);
}
.dish-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.food-desc {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-secondary);
}
.locate-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 100%;
  margin-top: 10px;
  padding: 7px;
  font-size: 12px;
}
.food-figure { margin-top: 10px; }
.food-figure-img {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 2;
  object-fit: cover;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-secondary);
  cursor: zoom-in;
}
.food-figure-foot {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 6px;
}
.food-figure-cap { font-size: 12px; color: var(--text-secondary); }
.food-figure-credit { font-size: 11px; color: var(--text-muted); }
.close-detail {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 14px;
}
.close-detail:hover { color: var(--text-gold); }
.close-detail-hint {
  font-size: 11px;
  font-weight: 400;
  color: var(--text-muted);
}

.food-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}
.food-item:hover { background: var(--bg-card-hover); }
.food-item.active { background: rgba(var(--rgb-gold), 0.1); }
.food-item-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.food-name {
  font-size: 12px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.food-county {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: var(--text-muted);
}
.monitor-empty { font-size: 12px; color: var(--text-muted); padding: 4px 0; line-height: 1.6; }

.data-note {
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-muted);
  padding: 0 2px 6px;
}
</style>

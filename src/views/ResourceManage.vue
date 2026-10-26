<template>
  <div class="resource-manage">
    <div class="search-bar common-card">
      <input v-model="searchKw" class="search-input" :placeholder="t('搜索资源名称...')" />
      <select v-model="selType">
        <option value="all">{{ t('全部类型') }}</option>
        <option v-for="it in typeOptions" :key="it" :value="it">{{ tv(it) }}</option>
      </select>
      <select v-model="selLevel">
        <option value="all">{{ t('全部等级') }}</option>
        <option v-for="l in levelOptions" :key="l" :value="l">{{ tv(l) }}</option>
      </select>
      <select v-model="selCity">
        <option value="all">{{ t('全部城市') }}</option>
        <option v-for="c in cityOptions" :key="c" :value="c">{{ tv(c) }}</option>
      </select>
      <div class="search-actions">
        <button class="btn" @click="showMsg(t('正在导出资源清单 Excel（占位）...'))">{{ t('导出Excel') }}</button>
        <button class="btn btn-primary" @click="openAdd">+ {{ t('新增资源') }}</button>
      </div>
    </div>

    <div class="layout">
      <aside class="tree-panel common-card">
        <div class="tree-header">{{ t('资源分类 · {scope}', { scope: scopeLabel }) }}</div>
        <div class="tree-note">{{ t('分类数量按当前范围折算；清单为已录入台账明细') }}</div>
        <div v-for="node in treeNodes" :key="node.type" class="tree-node">
          <div
            class="tree-type"
            :class="{ active: selType === node.type }"
            @click="toggleType(node.type)"
          >
            <span class="arrow">
              <AppIcon :name="expandedTypes.includes(node.type) ? 'caret-down' : 'caret-right'" :size="11" />
            </span>
            <span class="type-name">{{ tv(node.type) }}</span>
          </div>
          <div v-show="expandedTypes.includes(node.type)" class="tree-children">
            <div
              v-for="c in node.children"
              :key="c.name"
              class="tree-child"
              @click="onChild(c.name, node.type)"
            >
              <span class="child-name">{{ tv(c.name) }}</span>
              <span class="child-count">{{ c.count }}</span>
            </div>
          </div>
        </div>
      </aside>

      <div class="right">
        <ChartCard :title="densityTitle" :option="cityDensityOption" height="220px">
          <template #extra>
            <button class="btn" @click="viewMap">{{ t('查看地图') }}</button>
          </template>
        </ChartCard>

        <div class="common-card table-card">
          <div class="card-title">
            <span>{{ t('资源清单（{n} 条）· {scope}', { n: filteredList.length, scope: scopeLabel }) }}</span>
            <span v-if="conflictCount > 0" class="tag tag-red">{{ t('{n} 处红线冲突', { n: conflictCount }) }}</span>
          </div>
          <table class="common-table">
            <thead>
              <tr>
                <th>{{ t('名称') }}</th>
                <th>{{ t('类型') }}</th>
                <th>{{ t('等级') }}</th>
                <th>{{ t('所在市') }}</th>
                <th>{{ t('状态') }}</th>
                <th>{{ t('更新时间') }}</th>
                <th style="width: 150px">{{ t('操作') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in filteredList" :key="r.id" :class="{ 'row-conflict': isConflict(r.id) }">
                <td>
                  <a
                    class="res-name"
                    :class="{ clickable: isConflict(r.id) }"
                    @click="isConflict(r.id) && showConflict(r)"
                  >{{ tv(r.name) }}</a>
                  <span v-if="isConflict(r.id)" class="tag tag-red conflict-tag">{{ t('冲突') }}</span>
                </td>
                <td>{{ tv(r.type) }}</td>
                <td>{{ tv(r.level) }}</td>
                <td>{{ tv(r.city) }}</td>
                <td><span class="tag" :class="statusTag(r.status)">{{ tv(r.status) }}</span></td>
                <td>{{ r.updateTime }}</td>
                <td>
                  <button class="btn" @click="openEdit(r)">{{ t('编辑') }}</button>
                  <button class="btn" @click="removeRow(r)">{{ t('删除') }}</button>
                </td>
              </tr>
              <tr v-if="filteredList.length === 0">
                <td colspan="7" class="empty">{{ t('暂无符合条件的资源') }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <ImageGallery page="resource" :title="t('文旅资源管理场景图集')" />
      </div>
    </div>

    <div v-if="activeConflict" class="conflict-panel">
      <div class="conflict-header">
        <span>{{ t('生态红线冲突详情') }}</span>
        <button class="close-btn" @click="activeConflict = null">×</button>
      </div>
      <div class="conflict-name">{{ tv(activeConflict.name) }}</div>
      <div class="conflict-reason">{{ tv(activeConflict.reason) }}</div>
    </div>

    <div v-if="showModal" class="modal-mask" @click.self="showModal = false">
      <div class="modal">
        <div class="modal-title">{{ modalTitle }}</div>
        <div class="form-row">
          <label>{{ t('资源名称') }}</label>
          <input v-model="form.name" :placeholder="t('请输入资源名称')" />
        </div>
        <div class="form-row">
          <label>{{ t('资源类型') }}</label>
          <select v-model="form.type">
            <option v-for="it in typeOptions" :key="it" :value="it">{{ tv(it) }}</option>
          </select>
        </div>
        <div class="form-row">
          <label>{{ t('资源等级') }}</label>
          <select v-model="form.level">
            <option v-for="l in levelOptions" :key="l" :value="l">{{ tv(l) }}</option>
          </select>
        </div>
        <div class="form-row">
          <label>{{ t('所在城市') }}</label>
          <select v-model="form.city">
            <option v-for="c in cityOptions" :key="c" :value="c">{{ tv(c) }}</option>
          </select>
        </div>
        <div class="form-row">
          <label>{{ t('状态') }}</label>
          <select v-model="form.status">
            <option value="正常">{{ tv('正常') }}</option>
            <option value="维护中">{{ tv('维护中') }}</option>
            <option value="已关闭">{{ tv('已关闭') }}</option>
          </select>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="showModal = false">{{ t('取消') }}</button>
          <button class="btn btn-primary" @click="saveForm">{{ t('保存') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import ChartCard from '../components/common/ChartCard.vue'
import ImageGallery from '../components/common/ImageGallery.vue'
import AppIcon from '../components/common/AppIcon.vue'
import {
  mockResourceTree,
  mockResourceList,
  mockConflictList,
  mockHomeData,
} from '../mock'
import { themeAccent, themeAccentAlpha } from '../config/theme'
import { t, tv } from '../config/i18n'
import { SHANDONG_CITIES } from '../config/shandongRegions'
import {
  filterByCity,
  normCity,
  scaleNum,
  scopeCity,
  scopeCitySet,
  scopeLabel,
  scopeShortName,
  scopeUnits,
  unitValue,
} from '../config/scopeData'
import type { ResourceItem, ConflictItem } from '../types'

const router = useRouter()

const searchKw = ref('')
const selType = ref('all')
const selLevel = ref('all')
const selCity = ref('all')
const treeKw = ref('')
const expandedTypes = ref<string[]>([mockResourceTree[0]?.type ?? ''])

const typeOptions = mockResourceTree.map((t) => t.type)

const treeNodes = computed(() =>
  mockResourceTree.map((node) => ({
    type: node.type,
    children: node.children.map((c) => ({
      name: c.name,
      count: scaleNum(c.count, `tree-${node.type}-${c.name}`),
    })),
  })),
)

function treeTypeOf(raw: string): string {
  if (raw.includes('文博') || raw.includes('博物') || raw.includes('场馆')) return '文博场馆'
  if (raw.includes('非遗')) return '非遗项目'
  if (raw.includes('村') || raw.includes('乡')) return '乡村旅游点'
  return 'A级景区'
}
function levelOfFlow(flow: number): string {
  if (flow >= 25000) return '5A'
  if (flow >= 15000) return '4A'
  if (flow >= 8000) return '3A'
  return '2A'
}
function rowsFromPoints(city: string): ResourceItem[] {
  return mockHomeData.resourcePoints
    .filter((p) => normCity(p.city) === city)
    .map((p, i) => ({
      id: `pt-${p.id}`,
      name: p.name,
      type: treeTypeOf(p.type),
      level: levelOfFlow(p.flow),
      city,
      status: (p.status === '预警' ? '维护中' : '正常') as ResourceItem['status'],
      updateTime: `2026-09-${String(10 + ((i * 3) % 14)).padStart(2, '0')}`,
    }))
}

const baseList = computed<ResourceItem[]>(() => {
  const listed = filterByCity(mockResourceList)
  const covered = new Set(listed.map((r) => r.city))
  const missing = Array.from(scopeCitySet.value).filter((c) => !covered.has(c))
  return [...listed, ...missing.flatMap((c) => rowsFromPoints(c))]
})

const levelOptions = computed(() => Array.from(new Set(baseList.value.map((r) => r.level))))
const cityOptions = computed(() => {
  const cities = Array.from(new Set(baseList.value.map((r) => r.city)))
  return cities.length ? cities : [...SHANDONG_CITIES]
})

const conflictMap = computed(() => {
  const m = new Map<string, ConflictItem>()
  mockConflictList.forEach((c) => m.set(c.id, c))
  return m
})
const conflictCount = computed(() => baseList.value.filter((r) => conflictMap.value.has(r.id)).length)
const activeConflict = ref<ConflictItem | null>(null)

function isConflict(id: string) {
  return conflictMap.value.has(id)
}
function showConflict(r: ResourceItem) {
  const c = conflictMap.value.get(r.id)
  if (c) activeConflict.value = c
}

function toggleType(t: string) {
  const idx = expandedTypes.value.indexOf(t)
  if (idx >= 0) expandedTypes.value.splice(idx, 1)
  else expandedTypes.value.push(t)
  selType.value = selType.value === t ? 'all' : t
  treeKw.value = ''
}
function onChild(childName: string, parentType: string) {
  selType.value = parentType
  selLevel.value = 'all'
  treeKw.value = childName
}
function matchLoose(level: string, kw: string): boolean {
  if (level === kw) return true
  const k = kw
    .replace('乡村旅游重点村', '重点村')
    .replace('乡村旅游特色村', '特色村')
    .replace(/级$/, '')
  return level.includes(k) || k.includes(level)
}

const filteredList = computed(() =>
  baseList.value.filter((r) => {
    if (searchKw.value && !r.name.includes(searchKw.value)) return false
    if (selType.value !== 'all' && r.type !== selType.value) return false
    if (selLevel.value !== 'all' && r.level !== selLevel.value) return false
    if (selCity.value !== 'all' && r.city !== selCity.value) return false
    if (treeKw.value && !matchLoose(r.level, treeKw.value)) return false
    return true
  }),
)

const densityTitle = computed(() =>
  scopeCity.value
    ? t('{city}市县区资源分布密度', { city: scopeCity.value })
    : t('资源分布密度（按城市）· {scope}', { scope: scopeShortName.value }),
)
const cityDensityOption = computed<Record<string, unknown>>(() => {
  const total = treeNodes.value.reduce(
    (s, n) => s + n.children.reduce((a, c) => a + c.count, 0),
    0,
  )
  const units = scopeUnits.value
  const labels = units.map((u) => tv(u.label))
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 20, bottom: 34 },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: { fontSize: 10, interval: 0, rotate: labels.length > 8 ? 32 : 0 },
    },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        name: scopeCity.value ? t('县区资源数量') : t('城市资源数量'),
        type: 'bar',
        barWidth: '45%',
        data: units.map((u) => unitValue(total, u, 'res-density')),
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: themeAccent() },
              { offset: 1, color: themeAccentAlpha(0.2) },
            ],
          },
        },
      },
    ],
  }
})

function statusTag(s: ResourceItem['status']): string {
  if (s === '正常') return 'tag-green'
  if (s === '维护中') return 'tag-orange'
  return 'tag-red'
}

const showModal = ref(false)
const modalTitle = ref('')
const form = reactive({ name: '', type: 'A级景区', level: '5A', city: '济南', status: '正常' as ResourceItem['status'] })

function openAdd() {
  modalTitle.value = t('新增资源')
  Object.assign(form, { name: '', type: 'A级景区', level: '5A', city: scopeCity.value ?? '济南', status: '正常' })
  showModal.value = true
}
function openEdit(r: ResourceItem) {
  modalTitle.value = t('编辑资源')
  Object.assign(form, { name: r.name, type: r.type, level: r.level, city: r.city, status: r.status })
  showModal.value = true
}
function showMsg(msg: string) { alert(msg) }
function saveForm() {
  alert(t('【{action}】保存成功（占位）：{name}', { action: modalTitle.value, name: form.name || t('未命名资源') }))
  showModal.value = false
}
function removeRow(r: ResourceItem) {
  if (window.confirm(t('确认删除资源【{name}】？此操作不可恢复。', { name: r.name }))) {
    alert(t('已删除【{name}】（占位）', { name: r.name }))
  }
}
function viewMap() {
  router.push('/scenic')
}
</script>

<style scoped>
.resource-manage {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.search-input {
  width: 220px;
}
.search-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}
.layout {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}
.tree-panel {
  width: 220px;
  flex-shrink: 0;
}
.tree-header {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  padding-bottom: 10px;
  margin-bottom: 6px;
  border-bottom: 1px solid var(--border-color);
}
.tree-note {
  margin: -2px 0 6px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-muted);
}
.tree-type {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 6px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 13px;
  color: var(--text-primary);
}
.tree-type:hover {
  background: var(--bg-card-hover);
}
.tree-type.active {
  color: var(--text-gold);
}
.tree-type .arrow {
  display: inline-flex;
  align-items: center;
  font-size: 10px;
  color: var(--text-muted);
}
.tree-child {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 6px 6px 22px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-secondary);
  border-radius: 4px;
}
.tree-child:hover {
  background: var(--bg-card-hover);
  color: var(--text-gold);
}
.child-count {
  font-size: 11px;
  color: var(--text-muted);
}
.right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.table-card {
  overflow-x: auto;
}
.row-conflict td {
  background: rgba(217, 79, 79, 0.08);
}
.res-name {
  color: var(--text-primary);
  cursor: default;
}
.res-name.clickable {
  color: var(--status-danger);
  cursor: pointer;
  text-decoration: underline;
}
.conflict-tag {
  margin-left: 6px;
}
.empty {
  text-align: center;
  color: var(--text-muted);
  padding: 24px 0;
}
.conflict-panel {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 320px;
  background: var(--bg-card);
  border: 1px solid var(--status-danger);
  border-radius: 6px;
  padding: 14px 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  z-index: 1100;
}
.conflict-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--status-danger);
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 8px;
}
.close-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 18px;
  cursor: pointer;
}
.conflict-name {
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 8px;
}
.conflict-reason {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
}
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
}
.modal {
  width: 420px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  padding: 20px;
  box-shadow: var(--shadow-card);
}
.modal-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
  padding-left: 8px;
  border-left: 3px solid var(--color-gold);
}
.form-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.form-row label {
  width: 70px;
  font-size: 13px;
  color: var(--text-secondary);
  text-align: right;
}
.form-row input,
.form-row select {
  flex: 1;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}
</style>

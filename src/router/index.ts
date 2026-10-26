import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { watch } from 'vue'
import { locale, t } from '../config/i18n'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Landing',
    component: () => import('../views/LandingView.vue'),
    meta: { title: '首页', bare: true },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../components/common/LoginScreen.vue'),
    meta: { title: '登录', bare: true },
  },
  {
    path: '/dashboard',
    name: 'Home',
    component: () => import('../views/HomeMapView.vue'),
    meta: { title: '首页', icon: 'home' },
  },
  {
    path: '/nature',
    name: 'Nature',
    component: () => import('../views/NatureReserveMap.vue'),
    meta: { title: '自然环境保护区图', icon: 'leaf' },
  },
  {
    path: '/scenic',
    name: 'Scenic',
    component: () => import('../views/ScenicMap.vue'),
    meta: { title: '旅游景点图', icon: 'scenic' },
  },
  {
    path: '/food',
    name: 'Food',
    component: () => import('../views/FoodCulture.vue'),
    meta: { title: '饮食文化', icon: 'food' },
  },
  {
    path: '/flow',
    name: 'Flow',
    component: () => import('../views/FlowMonitor.vue'),
    meta: { title: '客流监测与预警', icon: 'flow' },
  },
  {
    path: '/industry',
    name: 'Industry',
    component: () => import('../views/IndustryAnalysis.vue'),
    meta: { title: '文旅产业分析', icon: 'industry' },
  },
  {
    path: '/resource',
    name: 'Resource',
    component: () => import('../views/ResourceManage.vue'),
    meta: { title: '文旅资源管理', icon: 'resource' },
  },
  {
    path: '/opinion',
    name: 'Opinion',
    component: () => import('../views/opinion/OpinionParent.vue'),
    meta: { title: '生态环境治理舆情分析', icon: 'opinion' },
    children: [
      {
        path: 'topic',
        name: 'OpinionTopic',
        component: () => import('../views/opinion/TopicList.vue'),
        meta: { title: '热门话题' },
      },
      {
        path: 'analyze',
        name: 'OpinionAnalyze',
        component: () => import('../views/opinion/OpinionAnalyze.vue'),
        meta: { title: '舆情分析' },
      },
      {
        path: 'wordcloud',
        name: 'OpinionWordCloud',
        component: () => import('../views/opinion/WordCloud.vue'),
        meta: { title: '评论词云' },
      },
      {
        path: 'heat',
        name: 'OpinionHeat',
        component: () => import('../views/opinion/CommentHeat.vue'),
        meta: { title: '评论热力' },
      },
    ],
  },
  {
    path: '/marketing',
    name: 'Marketing',
    component: () => import('../views/MarketingMatrix.vue'),
    meta: { title: '智慧营销与新媒体矩阵', icon: 'marketing' },
  },
  {
    path: '/disaster',
    name: 'Disaster',
    component: () => import('../views/DisasterMonitor.vue'),
    meta: { title: '灾难监控和预测', icon: 'disaster' },
  },
  {
    path: '/heritage',
    name: 'Heritage',
    component: () => import('../views/HeritageDigital.vue'),
    meta: { title: '齐鲁文化遗产数字化', icon: 'heritage' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

const PLATFORM_TITLE = '“云游齐鲁”山东沿黄文旅数智传播平台'

function refreshDocumentTitle(page?: string) {
  const name = page ?? ((router.currentRoute.value.meta.title as string) || '')
  document.title = name ? `${t(name)} - ${t(PLATFORM_TITLE)}` : t(PLATFORM_TITLE)
}

router.beforeEach((to, _from, next) => {
  refreshDocumentTitle(to.meta.title as string)
  next()
})

watch(locale, () => {
  refreshDocumentTitle()
})

export default router

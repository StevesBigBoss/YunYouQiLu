import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { initAppTheme } from './config/appTheme'
import { initLocale } from './config/i18n'
import { installChunkReload, takePendingRoute } from './config/chunkReload'

// 应用上次选择的风格（含 ECharts 主题注册）
initAppTheme()

// 重新构建后旧页面里的分包请求会失败（点菜单没反应），这里自动刷新并回到用户点的那一页
installChunkReload(router)

const app = createApp(App)
app.use(router)

// 应用上次选择的界面语言：先等该语言的词典分包到位再挂载，
// 首屏直接是目标语言（否则会先渲染一帧中文再翻过去）。
void initLocale().finally(() => {
  app.mount('#app')
})

// 上次因构建过期刷新过：把用户当时要去的页面补上，刷新后新构建的分包都在
const pendingRoute = takePendingRoute()
void router.isReady().then(() => {
  if (pendingRoute && pendingRoute !== router.currentRoute.value.fullPath) {
    void router.replace(pendingRoute)
  } else if (window.location.search.includes('_r=')) {
    // _r 只是为了绕开 index.html 缓存，用完把地址栏恢复干净
    void router.replace(router.currentRoute.value.path)
  }
})

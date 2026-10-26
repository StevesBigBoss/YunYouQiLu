import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { initAppTheme } from './config/appTheme'
import { initLocale } from './config/i18n'
import { installChunkReload, takePendingRoute } from './config/chunkReload'

initAppTheme()

installChunkReload(router)

const app = createApp(App)
app.use(router)

void initLocale().finally(() => {
  app.mount('#app')
})

const pendingRoute = takePendingRoute()
void router.isReady().then(() => {
  if (pendingRoute && pendingRoute !== router.currentRoute.value.fullPath) {
    void router.replace(pendingRoute)
  } else if (window.location.search.includes('_r=')) {
    void router.replace(router.currentRoute.value.path)
  }
})

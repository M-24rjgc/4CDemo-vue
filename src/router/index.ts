import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: {
        title: '首页'
      }
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
      meta: {
        title: '实时仪表盘'
      }
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('../views/HistoryView.vue'),
      meta: {
        title: '历史数据'
      }
    },
    {
      path: '/analysis',
      name: 'analysis',
      component: () => import('../views/AnalysisView.vue'),
      meta: {
        title: '深度分析'
      }
    },
    {
      path: '/upload',
      name: 'upload',
      component: () => import('../views/UploadDataView.vue'),
      meta: {
        title: '上传训练数据'
      }
    }
  ]
})

// 设置页面标题
router.beforeEach((to, _from, next) => {
  document.title = `${to.meta.title} - 中长跑实时指导系统`
  next()
})

export default router

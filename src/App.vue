<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { 
  Monitor, 
  HomeFilled, 
  DataLine, 
  Histogram, 
  TrendCharts 
} from '@element-plus/icons-vue'

const route = useRoute()

// 当前活动路由
const activeRoute = computed(() => {
  return route.path
})
</script>

<template>
  <div class="app-container">
    <el-container>
      <el-header class="app-header">
        <div class="logo">
          <el-icon class="logo-icon"><Monitor /></el-icon>
          <span>中长跑实时指导系统</span>
        </div>
        <el-menu
          mode="horizontal"
          :ellipsis="false"
          :router="true"
          class="nav-menu"
          :default-active="activeRoute"
        >
          <el-menu-item index="/">
            <el-icon><HomeFilled /></el-icon>
            <span>首页</span>
          </el-menu-item>
          <el-menu-item index="/dashboard">
            <el-icon><DataLine /></el-icon>
            <span>实时仪表盘</span>
          </el-menu-item>
          <el-menu-item index="/history">
            <el-icon><Histogram /></el-icon>
            <span>历史数据</span>
          </el-menu-item>
          <el-menu-item index="/analysis">
            <el-icon><TrendCharts /></el-icon>
            <span>深度分析</span>
          </el-menu-item>
        </el-menu>
        <div class="user-menu">
          <el-dropdown>
            <el-avatar :size="32" src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" />
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item>个人设置</el-dropdown-item>
                <el-dropdown-item>帮助文档</el-dropdown-item>
                <el-dropdown-item divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="app-main">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
      <el-footer class="app-footer">
        中长跑实时指导系统 &copy; 2023-{{ new Date().getFullYear() }}
      </el-footer>
    </el-container>
  </div>
</template>

<style>
:root {
  --app-header-height: 60px;
  --app-footer-height: 40px;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f5f7fa;
  color: #333;
  margin: 0;
  padding: 0;
  height: 100vh;
}

.app-container {
  min-height: 100vh;
}

.app-header {
  background-color: #fff;
  border-bottom: 1px solid #ebeef5;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  padding: 0;
  display: flex;
  align-items: center;
  height: var(--app-header-height);
  position: relative;
  z-index: 10;
}

.logo {
  display: flex;
  align-items: center;
  padding: 0 20px;
  font-size: 18px;
  font-weight: bold;
  color: var(--el-color-primary);
  height: 100%;
  width: 300px;
}

.logo-icon {
  margin-right: 10px;
  font-size: 24px;
}

.nav-menu {
  flex: 1;
  border-bottom: none;
}

.user-menu {
  margin-right: 20px;
}

.app-main {
  padding: 0;
  min-height: calc(100vh - var(--app-header-height) - var(--app-footer-height));
  background-color: #f5f7fa;
}

.app-footer {
  text-align: center;
  color: #909399;
  font-size: 14px;
  padding: 10px 0;
  height: var(--app-footer-height);
  background-color: #fff;
  border-top: 1px solid #ebeef5;
}

/* 页面过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

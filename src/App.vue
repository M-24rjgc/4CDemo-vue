<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  Monitor,
  HomeFilled,
  DataLine,
  Histogram,
  TrendCharts
} from '@element-plus/icons-vue'

const route = useRoute()

// 修复当前活动路由的计算方式
const activeRoute = computed(() => route.path)
</script>

<template>
  <div class="app-container">
    <el-container class="full-height-container">
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
          <div class="menu-spacer"></div>
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
          <div class="menu-spacer"></div>
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

<style scoped>
:root {
  --app-header-height: 64px;
  --app-footer-height: 35px;
}

.app-container {
  min-height: 100vh;
  display: flex;
}

.full-height-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.app-header {
  background-color: #fff;
  border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5);
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  padding: 0 20px;
  display: flex;
  align-items: center;
  height: var(--app-header-height);
  position: sticky;
  top: 0;
  z-index: 100;
}

.logo {
  display: flex;
  align-items: center;
  font-size: 20px;
  font-weight: 600;
  color: var(--el-color-primary);
  width: auto;
  margin-right: 40px;
}

.logo-icon {
  margin-right: 8px;
  font-size: 28px;
}

.nav-menu {
  flex: 1;
  border-bottom: none;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: transparent;
}

.nav-menu .el-menu-item {
  flex: none;
  padding: 0 22px;
  transition: all 0.2s ease;
}

.nav-menu .el-menu-item:hover,
.nav-menu .el-menu-item.is-active {
  background-color: var(--el-color-primary-light-9, #ecf5ff);
  color: var(--el-color-primary);
}

.nav-menu .el-menu-item.is-active {
  border-bottom: 2px solid var(--el-color-primary);
}

.menu-spacer {
  flex-grow: 1;
}

.user-menu {
  margin-left: 20px;
  display: flex;
  align-items: center;
}

.app-main {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
  background-color: var(--el-color-primary-light-9, #f5f9ff);
}

.app-footer {
  text-align: center;
  color: var(--el-text-color-secondary, #909399);
  font-size: 13px;
  padding: 8px 0;
  height: var(--app-footer-height);
  background-color: #fff;
  border-top: 1px solid var(--el-border-color-lighter, #ebeef5);
  flex-shrink: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

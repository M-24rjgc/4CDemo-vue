<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, DataAnalysis, Monitor, Timer, Lightning, Aim } from '@element-plus/icons-vue'

const router = useRouter()

const navigateTo = (route: string) => {
  router.push({ name: route })
}

const features = [
  {
    title: '实时分析',
    description: '实时采集并分析运动姿态数据，提供即时反馈',
    icon: 'Monitor'
  },
  {
    title: '数据可视化',
    description: '直观展示步态相位、足压分布和姿态评分',
    icon: 'DataAnalysis'
  },
  {
    title: '历史追踪',
    description: '记录训练历史，追踪长期进步',
    icon: 'Timer'
  }
]
</script>

<template>
  <div class="home-container">
    <div class="header">
      <h1>中长跑实时指导系统</h1>
      <p class="subtitle">基于边缘AI的中长跑实时姿态分析与指导</p>
    </div>

    <div class="feature-container">
      <el-row :gutter="20">
        <el-col :span="8" v-for="(feature, index) in features" :key="index">
          <el-card class="feature-card" :body-style="{ padding: '0px' }">
            <div class="icon-container">
              <el-icon :size="50" class="feature-icon">
                <component :is="feature.icon"></component>
              </el-icon>
            </div>
            <div class="feature-content">
              <h3>{{ feature.title }}</h3>
              <p>{{ feature.description }}</p>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <div class="action-container">
      <el-button type="primary" size="large" @click="navigateTo('dashboard')">
        开始分析
        <el-icon class="el-icon--right"><ArrowRight /></el-icon>
      </el-button>
    </div>

    <div class="system-intro">
      <h2>系统架构</h2>
      <div class="architecture-diagram">
        <!-- 系统架构图 -->
        <el-image src="/architecture.jpg" alt="系统架构图" fit="contain"></el-image>
      </div>
      <div class="intro-text">
        <p>本系统采用多层架构设计，包括数据采集层、信号处理层、推理层和应用层。系统利用IMU和足压传感器数据，在设备本地进行实时分析，为跑者提供姿态评分、步态分析和改进建议。</p>
        <p>核心功能包括：实时数据分析、步态相位检测、姿态评分、足压分析、改进建议和历史数据追踪等。</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  text-align: center;
  margin-bottom: 3rem;
}

.header h1 {
  font-size: 2.5rem;
  color: var(--el-color-primary);
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1.2rem;
  color: var(--el-text-color-secondary);
}

.feature-container {
  margin-bottom: 3rem;
}

.feature-card {
  height: 100%;
  margin-bottom: 20px;
  transition: transform 0.3s;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 20px rgba(0, 0, 0, 0.1);
}

.icon-container {
  display: flex;
  justify-content: center;
  padding: 1.5rem;
  background-color: var(--el-color-primary-light-9);
}

.feature-icon {
  color: var(--el-color-primary);
}

.feature-content {
  padding: 1.5rem;
}

.feature-content h3 {
  margin-top: 0;
  color: var(--el-color-primary);
}

.action-container {
  text-align: center;
  margin-bottom: 3rem;
}

.system-intro {
  margin-top: 3rem;
}

.system-intro h2 {
  text-align: center;
  color: var(--el-color-primary);
  margin-bottom: 1.5rem;
}

.architecture-diagram {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}

.intro-text {
  text-align: justify;
  line-height: 1.6;
}
</style>

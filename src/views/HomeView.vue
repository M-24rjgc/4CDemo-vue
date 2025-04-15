<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, DataAnalysis, Monitor, Timer, Promotion, MagicStick, Cpu } from '@element-plus/icons-vue'
import { useAppModeStore, type AppMode } from '@/stores/appMode'

const router = useRouter()
const appModeStore = useAppModeStore()

// 选中的模式
const selectedMode = ref<AppMode>(appModeStore.mode)

// 开始训练并设置模式
const startTraining = () => {
  // 保存选择的模式
  appModeStore.setMode(selectedMode.value)
  // 导航到仪表盘
  router.push({ name: 'dashboard' })
}

// 模式选项
const modeOptions = [
  {
    value: 'simulation',
    label: '模拟数据模式'
  },
  {
    value: 'ai',
    label: 'AI引擎模式'
  }
]

const features = [
  {
    title: '实时监测',
    description: '高频采集并展示步频、步幅、心率等关键指标。',
    icon: Monitor,
    color: '#409EFF'
  },
  {
    title: '智能分析',
    description: '基于AI算法分析跑步姿态，提供姿态评分和足压分布。',
    icon: Cpu,
    color: '#67C23A'
  },
  {
    title: '即时反馈',
    description: '根据实时数据提供针对性的语音或文字指导建议。',
    icon: MagicStick,
    color: '#E6A23C'
  },
  {
    title: '历史追踪',
    description: '记录每次训练数据，可视化您的进步历程。',
    icon: DataAnalysis,
    color: '#F56C6C'
  }
]
</script>

<template>
  <div class="home-view">
    <section class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">中长跑实时指导系统</h1>
        <p class="hero-subtitle">您的专属AI跑步教练，实时分析，科学指导</p>

        <!-- 模式选择 -->
        <div class="mode-selection">
          <el-radio-group v-model="selectedMode" size="large" class="mode-radio-group">
            <el-radio-button v-for="option in modeOptions" :key="option.value" :label="option.value">
              <el-icon v-if="option.value === 'ai'"><Cpu /></el-icon>
              <el-icon v-else><Monitor /></el-icon>
              {{ option.label }}
            </el-radio-button>
          </el-radio-group>

          <div class="mode-description">
            <el-alert
              v-if="selectedMode === 'ai'"
              type="success"
              show-icon
              :closable="false"
            >
              <template #title>
                <span class="mode-alert-title">AI引擎模式已选择</span>
              </template>
              <p>使用TensorFlow Lite模型进行实时姿态分析，提供专业指导。</p>
            </el-alert>

            <el-alert
              v-else
              type="info"
              show-icon
              :closable="false"
            >
              <template #title>
                <span class="mode-alert-title">模拟数据模式已选择</span>
              </template>
              <p>使用模拟数据展示系统功能，适合演示和体验。</p>
            </el-alert>
          </div>
        </div>

        <el-button
          type="primary"
          size="large"
          round
          class="hero-cta-button"
          @click="startTraining"
        >
          <el-icon><Promotion /></el-icon>
          <span>开始我的训练</span>
        </el-button>
      </div>
       <div class="hero-image-container">
         <!-- Placeholder for an engaging image or animation -->
         <img src="../assets/logo.svg" alt="Running Illustration" class="hero-image"/>
       </div>
    </section>

    <section class="features-section">
      <h2 class="section-title">核心功能</h2>
      <el-row :gutter="30">
        <el-col :xs="24" :sm="12" :md="6" v-for="(feature, index) in features" :key="index">
          <el-card class="feature-card" shadow="hover">
            <div class="feature-icon-wrapper" :style="{ backgroundColor: feature.color + '1A' }">
              <el-icon :size="40" class="feature-icon" :style="{ color: feature.color }">
                <component :is="feature.icon"></component>
              </el-icon>
            </div>
            <div class="feature-content">
              <h3 class="feature-title">{{ feature.title }}</h3>
              <p class="feature-description">{{ feature.description }}</p>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </section>

    <section class="how-it-works-section">
       <h2 class="section-title">工作原理</h2>
       <div class="steps-container">
         <el-steps :active="4" align-center finish-status="success">
           <el-step title="数据采集" description="佩戴传感器实时获取运动数据"></el-step>
           <el-step title="边缘计算" description="设备端AI模型进行快速分析处理"></el-step>
           <el-step title="实时反馈" description="通过APP或语音提供即时指导"></el-step>
           <el-step title="云端同步" description="训练结束后数据同步至云端分析"></el-step>
         </el-steps>
       </div>
     </section>

    <!-- 可以保留或重构系统介绍部分 -->
    <!--
    <section class="system-intro-section">
      <h2 class="section-title">系统架构</h2>
      ...
    </section>
    -->

  </div>
</template>

<style scoped>
.home-view {
  padding: 0; /* 移除内边距，让 section 控制 */
}

/* Hero Section Styles */
.hero-section {
  display: flex;
  align-items: center;
  justify-content: space-between; /* 两端对齐 */
  padding: 60px 40px; /* 上下 60px，左右 40px */
  background: linear-gradient(135deg, var(--el-color-primary-light-7), var(--el-color-primary-light-9));
  border-radius: 0 0 20px 20px; /* 底部圆角 */
  min-height: 400px; /* 最小高度 */
  overflow: hidden; /* 防止图片溢出 */
}

.hero-content {
  max-width: 50%; /* 限制内容宽度 */
  z-index: 1; /* 保证内容在图片上层 */
}

.hero-title {
  font-size: 3rem; /* 增大标题字号 */
  font-weight: bold;
  color: var(--el-color-primary);
  margin-bottom: 1rem;
  line-height: 1.2;
}

.hero-subtitle {
  font-size: 1.4rem; /* 增大副标题字号 */
  color: var(--el-text-color-regular);
  margin-bottom: 2rem;
  line-height: 1.6;
}

/* 模式选择样式 */
.mode-selection {
  margin-bottom: 2rem;
  background-color: rgba(255, 255, 255, 0.8);
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.mode-radio-group {
  margin-bottom: 1rem;
  width: 100%;
  display: flex;
  justify-content: space-around;
}

:deep(.el-radio-button) {
  width: 48%;
}

:deep(.el-radio-button__inner) {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 0;
}

.mode-description {
  margin-top: 15px;
}

:deep(.el-alert) {
  padding: 15px;
  border-radius: 8px;
}

.mode-alert-title {
  font-weight: bold;
  font-size: 1.05rem;
}

.hero-cta-button {
  padding: 15px 30px; /* 增大按钮内边距 */
  font-size: 1.1rem; /* 增大按钮字体 */
  box-shadow: 0 4px 10px rgba(0, 123, 255, 0.3);
  transition: all 0.3s ease;
}

.hero-cta-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(0, 123, 255, 0.4);
}

.hero-image-container {
   max-width: 45%; /* 图片容器宽度 */
   display: flex;
   justify-content: center;
   align-items: center;
}

.hero-image {
  max-width: 100%; /* 图片最大宽度 */
  height: auto;
  display: block;
  /* 可以添加动画效果 */
  animation: float 6s ease-in-out infinite;
}

/* 悬浮动画 */
@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-15px); }
  100% { transform: translateY(0px); }
}

/* Section Title Styles */
.section-title {
  text-align: center;
  font-size: 2rem; /* 调整章节标题大小 */
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 3rem; /* 增加底部间距 */
  position: relative;
  padding-bottom: 10px;
}

/* 给标题添加下划线装饰 */
.section-title::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 60px;
  height: 4px;
  background-color: var(--el-color-primary);
  border-radius: 2px;
}

/* Features Section Styles */
.features-section {
  padding: 60px 40px;
}

.feature-card {
  border-radius: 12px; /* 增加圆角 */
  border: 1px solid var(--el-border-color-lighter);
  text-align: center;
  transition: all 0.3s ease;
  background-color: #fff;
  margin-bottom: 30px; /* 增加卡片间距 */
  display: flex;
  flex-direction: column;
  height: 100%; /* 使卡片等高 */
}

.feature-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--el-box-shadow-light);
}

.feature-icon-wrapper {
  padding: 25px; /* 图标内边距 */
  border-radius: 50%; /* 圆形背景 */
  display: inline-flex; /* 使背景适应内容 */
  margin: 20px auto; /* 上下边距和水平居中 */
}

.feature-icon {
  /* 颜色已在模板中通过 style 绑定 */
}

.feature-content {
  padding: 0 20px 20px; /* 调整内边距 */
  flex-grow: 1; /* 使内容区域填充剩余空间 */
}

.feature-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-top: 0;
  margin-bottom: 0.8rem;
}

.feature-description {
  font-size: 0.95rem;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

/* How It Works Section Styles */
.how-it-works-section {
  padding: 60px 40px;
  background-color: #f8f9fa;
}

.steps-container {
  max-width: 1000px;
  margin: 0 auto;
}

/* 调整 Element Plus Steps 样式 (可选) */
:deep(.el-step__title) {
  font-size: 1.1rem;
  font-weight: 500;
}

:deep(.el-step__description) {
  font-size: 0.95rem;
}

/* Responsive adjustments */
@media (max-width: 992px) {
  .hero-section {
    flex-direction: column;
    text-align: center;
    padding: 40px 20px;
  }
  .hero-content {
    max-width: 100%;
    margin-bottom: 30px;
  }
  .hero-image-container {
    max-width: 60%; /* 移动端适当调整图片大小 */
    margin-top: 20px;
  }
  .hero-title {
    font-size: 2.5rem;
  }
  .hero-subtitle {
    font-size: 1.2rem;
  }

  /* 移动端模式选择样式适配 */
  .mode-radio-group {
    flex-direction: column;
    align-items: center;
  }

  :deep(.el-radio-button) {
    width: 100%;
    margin-bottom: 10px;
  }
}

@media (max-width: 768px) {
  .features-section,
  .how-it-works-section {
    padding: 40px 20px;
  }
  .section-title {
    font-size: 1.8rem;
    margin-bottom: 2rem;
  }
  .feature-title {
    font-size: 1.2rem;
  }
  .feature-description {
    font-size: 0.9rem;
  }
}

</style>

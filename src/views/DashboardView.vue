<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { ArrowLeft, Stopwatch, Odometer, Aim, MagicStick, Warning /*, More icons as needed */ } from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const navigateBack = () => {
  router.push({ name: 'home' });
};

// 评分颜色计算
const scoreColor = (score: number): string => {
  if (score >= 90) {
    return '#67c23a'; // 绿色
  } else if (score >= 80) {
    return '#409eff'; // 蓝色
  } else if (score >= 70) {
    return '#e6a23c'; // 黄色
  } else {
    return '#f56c6c'; // 红色
  }
};

// 模拟数据
const runningData = ref({
  pace: 5.2, // 配速 (分钟/公里)
  heartRate: 142, // 心率
  cadence: 172, // 步频
  distance: 2.5, // 距离 (公里)
  duration: '18:42', // 持续时间
  calories: 245, // 卡路里
  score: 86 // 综合评分
});

// 足部着地方式分布
const footStrikeData = ref({
  forefoot: 65, // 前脚掌着地比例
  midfoot: 30, // 中脚掌着地比例
  rearfoot: 5 // 后脚掌着地比例
});

// 姿态评估
const postureScores = ref({
  upperBody: 88, // 上身
  armSwing: 82, // 手臂摆动
  legLift: 90, // 抬腿高度
  footLanding: 85, // 足部着地
  overall: 86 // 总评分
});

// 模拟数据更新
let dataUpdateInterval: number | null = null;

onMounted(() => {
  // 模拟数据更新
  dataUpdateInterval = window.setInterval(() => {
    // 随机波动数据
    runningData.value.pace = Math.max(4.8, Math.min(5.5, runningData.value.pace + (Math.random() - 0.5) * 0.1));
    runningData.value.heartRate = Math.max(135, Math.min(155, runningData.value.heartRate + Math.floor((Math.random() - 0.5) * 5)));
    runningData.value.cadence = Math.max(168, Math.min(178, runningData.value.cadence + Math.floor((Math.random() - 0.5) * 3)));
    runningData.value.distance += 0.01;

    // 更新时间
    const [mins, secs] = runningData.value.duration.split(':').map(Number);
    let totalSecs = mins * 60 + secs + 1;
    const newMins = Math.floor(totalSecs / 60);
    const newSecs = totalSecs % 60;
    runningData.value.duration = `${newMins}:${newSecs.toString().padStart(2, '0')}`;

    runningData.value.calories += 1;

    // 更新姿态评分
    postureScores.value.upperBody = Math.max(75, Math.min(95, postureScores.value.upperBody + (Math.random() - 0.5) * 2));
    postureScores.value.armSwing = Math.max(75, Math.min(95, postureScores.value.armSwing + (Math.random() - 0.5) * 2));
    postureScores.value.legLift = Math.max(75, Math.min(95, postureScores.value.legLift + (Math.random() - 0.5) * 2));
    postureScores.value.footLanding = Math.max(75, Math.min(95, postureScores.value.footLanding + (Math.random() - 0.5) * 2));
    postureScores.value.overall = (
      postureScores.value.upperBody +
      postureScores.value.armSwing +
      postureScores.value.legLift +
      postureScores.value.footLanding
    ) / 4;

    // 更新足部着地方式
    footStrikeData.value.forefoot = Math.max(60, Math.min(70, footStrikeData.value.forefoot + (Math.random() - 0.5) * 2));
    footStrikeData.value.midfoot = Math.max(25, Math.min(35, footStrikeData.value.midfoot + (Math.random() - 0.5) * 2));
    footStrikeData.value.rearfoot = 100 - footStrikeData.value.forefoot - footStrikeData.value.midfoot;
  }, 1000);
});

onUnmounted(() => {
  if (dataUpdateInterval) {
    clearInterval(dataUpdateInterval);
  }
});

// 建议提示
const suggestions = ref([
  { type: 'info', text: "尝试提高步频至175-180步/分钟以提高效率" },
  { type: 'warning', text: "保持上身稳定，减少左右摇摆" },
  { type: 'success', text: "足部着地方式良好，继续保持" },
  { type: 'info', text: "保持手臂90度弯曲，与步频同步" }
]);

// 当前显示的建议索引
const currentSuggestionIndex = ref(0);

// 计算当前显示的建议
const currentSuggestion = computed(() => {
  return suggestions.value[currentSuggestionIndex.value];
});

// 建议轮播
let suggestionInterval: number | null = null;
onMounted(() => {
  // ... (Existing data update interval)

  suggestionInterval = window.setInterval(() => {
    currentSuggestionIndex.value = (currentSuggestionIndex.value + 1) % suggestions.value.length;
  }, 5000); // 每5秒切换一次建议
});

onUnmounted(() => {
  // ... (Existing data update interval clearing)
  if (suggestionInterval) {
    clearInterval(suggestionInterval);
  }
});

// 添加图标映射
const getMetricIcon = (metric: string) => {
  switch (metric) {
    case 'distance': return Odometer;
    case 'duration': return Stopwatch;
    case 'calories': return MagicStick; // Using MagicStick as a placeholder for calories
    case 'score': return Aim;
    default: return null;
  }
};

</script>

<template>
  <div class="dashboard-view">
    <el-page-header @back="navigateBack" class="page-header">
      <template #content>
        <span class="text-large font-600 mr-3"> 实时跑步监测 </span>
      </template>
    </el-page-header>

    <!-- Main Metrics -->
    <el-row :gutter="24" class="main-metrics">
      <el-col :xs="24" :sm="8">
        <el-card class="metric-card main-metric-card pace-card" shadow="hover">
          <div class="metric-content">
            <div class="metric-value">{{ runningData.pace.toFixed(1) }}</div>
            <div class="metric-label">配速 <span class="metric-unit">(分钟/公里)</span></div>
          </div>
          <!-- Optional Icon -->
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8">
        <el-card class="metric-card main-metric-card hr-card" shadow="hover">
           <div class="metric-content">
            <div class="metric-value">{{ runningData.heartRate }}</div>
            <div class="metric-label">心率 <span class="metric-unit">(次/分钟)</span></div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8">
        <el-card class="metric-card main-metric-card cadence-card" shadow="hover">
           <div class="metric-content">
            <div class="metric-value">{{ runningData.cadence }}</div>
            <div class="metric-label">步频 <span class="metric-unit">(步/分钟)</span></div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Secondary Metrics -->
    <el-row :gutter="20" class="secondary-metrics">
      <el-col :xs="12" :sm="6">
        <el-card class="metric-card secondary-metric-card" shadow="hover">
          <el-icon class="metric-icon" :size="24"><component :is="getMetricIcon('distance')" /></el-icon>
          <div class="metric-info">
            <div class="metric-value-small">{{ runningData.distance.toFixed(2) }}</div>
            <div class="metric-label-small">距离 (公里)</div>
          </div>
        </el-card>
      </el-col>
       <el-col :xs="12" :sm="6">
        <el-card class="metric-card secondary-metric-card" shadow="hover">
           <el-icon class="metric-icon" :size="24"><component :is="getMetricIcon('duration')" /></el-icon>
          <div class="metric-info">
            <div class="metric-value-small">{{ runningData.duration }}</div>
            <div class="metric-label-small">时间</div>
          </div>
        </el-card>
      </el-col>
       <el-col :xs="12" :sm="6">
        <el-card class="metric-card secondary-metric-card" shadow="hover">
           <el-icon class="metric-icon" :size="24"><component :is="getMetricIcon('calories')" /></el-icon>
          <div class="metric-info">
            <div class="metric-value-small">{{ runningData.calories }}</div>
            <div class="metric-label-small">卡路里 (千卡)</div>
          </div>
        </el-card>
      </el-col>
       <el-col :xs="12" :sm="6">
        <el-card class="metric-card secondary-metric-card" shadow="hover">
          <el-icon class="metric-icon" :size="24"><component :is="getMetricIcon('score')" /></el-icon>
          <div class="metric-info">
             <div class="metric-value-small score-value" :style="{ color: scoreColor(postureScores.overall) }">
                {{ Math.round(postureScores.overall) }}
             </div>
            <div class="metric-label-small">综合评分</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Analysis Section -->
    <el-row :gutter="24" class="analysis-section">
      <!-- Posture Analysis -->
      <el-col :xs="24" :md="12">
        <el-card class="analysis-card posture-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span>姿态评估</span>
              <el-tag :type="scoreColor(postureScores.overall) === '#67c23a' ? 'success' : scoreColor(postureScores.overall) === '#409eff' ? 'primary' : scoreColor(postureScores.overall) === '#e6a23c' ? 'warning' : 'danger'" size="small" effect="dark">
                总评分: {{ Math.round(postureScores.overall) }}
              </el-tag>
            </div>
          </template>
          <div class="posture-scores">
            <div class="posture-item">
              <span class="posture-label">上身稳定性</span>
              <el-progress
                :percentage="Math.round(postureScores.upperBody)"
                :color="scoreColor(postureScores.upperBody)"
                :stroke-width="16"
                :text-inside="false"
                class="posture-progress"
              >
                <span class="progress-text">{{ Math.round(postureScores.upperBody) }}%</span>
              </el-progress>
            </div>
            <div class="posture-item">
              <span class="posture-label">手臂摆动</span>
              <el-progress
                :percentage="Math.round(postureScores.armSwing)"
                :color="scoreColor(postureScores.armSwing)"
                :stroke-width="16"
                 :text-inside="false"
                 class="posture-progress"
              >
                 <span class="progress-text">{{ Math.round(postureScores.armSwing) }}%</span>
              </el-progress>
            </div>
             <div class="posture-item">
              <span class="posture-label">抬腿高度</span>
              <el-progress
                :percentage="Math.round(postureScores.legLift)"
                :color="scoreColor(postureScores.legLift)"
                :stroke-width="16"
                 :text-inside="false"
                 class="posture-progress"
              >
                 <span class="progress-text">{{ Math.round(postureScores.legLift) }}%</span>
              </el-progress>
            </div>
             <div class="posture-item">
              <span class="posture-label">足部着地</span>
              <el-progress
                :percentage="Math.round(postureScores.footLanding)"
                :color="scoreColor(postureScores.footLanding)"
                :stroke-width="16"
                 :text-inside="false"
                 class="posture-progress"
              >
                 <span class="progress-text">{{ Math.round(postureScores.footLanding) }}%</span>
              </el-progress>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- Foot Strike & Suggestions -->
      <el-col :xs="24" :md="12">
         <!-- Foot Strike -->
        <el-card class="analysis-card foot-strike-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span>足部着地方式</span>
            </div>
          </template>
          <div class="foot-strike-distribution">
             <div class="foot-strike-bar">
              <div
                class="strike-segment forefoot"
                :style="{ width: footStrikeData.forefoot + '%' }"
                v-tooltip="`前脚掌: ${Math.round(footStrikeData.forefoot)}%`"
              ></div>
              <div
                class="strike-segment midfoot"
                :style="{ width: footStrikeData.midfoot + '%' }"
                 v-tooltip="`中脚掌: ${Math.round(footStrikeData.midfoot)}%`"
              ></div>
              <div
                class="strike-segment rearfoot"
                :style="{ width: footStrikeData.rearfoot + '%' }"
                 v-tooltip="`后脚掌: ${Math.round(footStrikeData.rearfoot)}%`"
              ></div>
            </div>
             <div class="foot-strike-legend">
              <span class="legend-item"><span class="dot forefoot"></span>前脚掌 {{ Math.round(footStrikeData.forefoot) }}%</span>
              <span class="legend-item"><span class="dot midfoot"></span>中脚掌 {{ Math.round(footStrikeData.midfoot) }}%</span>
              <span class="legend-item"><span class="dot rearfoot"></span>后脚掌 {{ Math.round(footStrikeData.rearfoot) }}%</span>
            </div>
            <!-- Consider adding ECharts Pie chart here later -->
          </div>
        </el-card>

        <!-- Suggestions -->
        <el-card class="analysis-card suggestions-card" shadow="never">
           <template #header>
            <div class="card-header">
              <span>实时建议</span>
              <el-icon><MagicStick /></el-icon>
            </div>
          </template>
          <el-alert
            :title="currentSuggestion.text"
            :type="currentSuggestion.type as ('success' | 'warning' | 'info' | 'error')"
            :closable="false"
            show-icon
            effect="light"
            class="suggestion-alert"
           >
           </el-alert>
        </el-card>

      </el-col>
    </el-row>

  </div>
</template>

<style scoped>
.dashboard-view {
  padding: 20px;
}

.page-header {
  margin-bottom: 25px;
  background-color: #fff;
  padding: 15px 20px;
  border-radius: 8px;
  box-shadow: var(--el-box-shadow-light);
}

.text-large {
  font-size: 1.25rem; /* 调整标题大小 */
}

.metric-card {
  border-radius: 12px; /* 更大的圆角 */
  overflow: hidden; /* 确保内容不溢出 */
  margin-bottom: 20px; /* 统一间距 */
  transition: all 0.3s ease;
  border: none; /* 移除默认边框 */
  box-shadow: var(--el-box-shadow-light);
}

.metric-card:hover {
   transform: translateY(-5px);
   box-shadow: var(--el-box-shadow);
}

/* Main Metrics */
.main-metrics {
  margin-bottom: 10px;
}

.main-metric-card {
  text-align: center;
  padding: 25px 15px; /* 增加内边距 */
  background: linear-gradient(135deg, #ffffff, #f8faff);
}

.pace-card { border-left: 5px solid var(--el-color-primary); }
.hr-card { border-left: 5px solid var(--el-color-danger); }
.cadence-card { border-left: 5px solid var(--el-color-success); }

.metric-content {
  /* 内容样式 */
}

.metric-value {
  font-size: 2.8rem; /* 增大主要指标数值 */
  font-weight: bold;
  line-height: 1.2;
  margin-bottom: 5px;
  color: var(--el-text-color-primary);
  /* 根据卡片类型设置不同颜色 */
}
.pace-card .metric-value { color: var(--el-color-primary); }
.hr-card .metric-value { color: var(--el-color-danger); }
.cadence-card .metric-value { color: var(--el-color-success); }


.metric-label {
  font-size: 1rem;
  color: var(--el-text-color-secondary);
}

.metric-unit {
  font-size: 0.85rem;
  margin-left: 3px;
}

/* Secondary Metrics */
.secondary-metrics {
  margin-bottom: 10px;
}

.secondary-metric-card {
  display: flex;
  align-items: center;
  padding: 15px 20px; /* 调整内边距 */
  background-color: #fff;
}

.metric-icon {
  margin-right: 15px;
  color: var(--el-color-primary);
}

.metric-info {
  flex-grow: 1;
}

.metric-value-small {
  font-size: 1.5rem; /* 调整次要指标数值大小 */
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.3;
}

.score-value {
   font-weight: bold;
}

.metric-label-small {
  font-size: 0.85rem;
  color: var(--el-text-color-secondary);
}

/* Analysis Section */
.analysis-section {
  margin-top: 15px;
}

.analysis-card {
  border-radius: 12px;
  margin-bottom: 20px;
  border: 1px solid var(--el-border-color-lighter); /* 浅边框 */
  background-color: #fff;
}

/* 重写 Card Header 样式 */
:deep(.analysis-card .el-card__header) {
  background-color: #f9fafc;
  border-bottom: 1px solid var(--el-border-color-lighter);
  padding: 12px 20px; /* 调整 Header 内边距 */
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.card-header .el-icon {
  color: var(--el-color-primary);
}

/* Posture Scores */
.posture-card :deep(.el-card__body) {
  padding-top: 15px;
  padding-bottom: 15px;
}

.posture-scores {
  /* styles for posture scores container */
}

.posture-item {
  display: flex;
  align-items: center;
  margin-bottom: 18px; /* 稍微增加项间距 */
}
.posture-item:last-child {
  margin-bottom: 0;
}

.posture-label {
  width: 90px; /* 调整标签宽度 */
  font-size: 0.9rem;
  color: var(--el-text-color-secondary);
  margin-right: 15px;
  text-align: right;
  flex-shrink: 0;
}

/* --- Style the progress bar --- */
.posture-progress {
  flex-grow: 1;
  /* 将文本移到右侧 */
  display: flex;
  align-items: center;
}

/* 隐藏默认的进度条文本容器 */
:deep(.posture-progress .el-progress__text) {
  display: none;
}

/* 进度条容器圆角 */
:deep(.posture-progress .el-progress-bar__outer) {
  border-radius: 8px; /* 添加圆角 */
}
/* 进度条本身圆角 */
:deep(.posture-progress .el-progress-bar__inner) {
  border-radius: 8px; /* 添加圆角 */
}

/* 自定义进度文本样式 */
.progress-text {
  font-size: 0.9rem;
  color: var(--el-text-color-primary);
  font-weight: 600;
  margin-left: 10px; /* 文本与进度条的间距 */
  min-width: 35px; /* 确保文本空间 */
  text-align: right;
}

/* Foot Strike */
.foot-strike-card :deep(.el-card__body) {
  padding: 20px;
}

.foot-strike-distribution {
  /* container style */
}

.foot-strike-bar {
  display: flex;
  height: 25px; /* 调整高度 */
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 15px;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
}

.strike-segment {
  height: 100%;
  transition: width 0.5s ease-in-out;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.8rem;
  font-weight: bold;
  position: relative; /* For tooltip */
}

.strike-segment.forefoot { background-color: #E6A23C; } /* 黄色 */
.strike-segment.midfoot { background-color: #67C23A; } /* 绿色 */
.strike-segment.rearfoot { background-color: #F56C6C; } /* 红色 */

.foot-strike-legend {
  display: flex;
  justify-content: center;
  flex-wrap: wrap; /* Allow wrapping on small screens */
  gap: 15px; /* Spacing between items */
  font-size: 0.9rem;
  color: var(--el-text-color-secondary);
}

.legend-item {
  display: flex;
  align-items: center;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 6px;
  display: inline-block;
}

.dot.forefoot { background-color: #E6A23C; }
.dot.midfoot { background-color: #67C23A; }
.dot.rearfoot { background-color: #F56C6C; }

/* Suggestions Card */
.suggestions-card {
   border-top: 3px solid var(--el-color-primary);
}

.suggestions-card :deep(.el-card__body) {
   padding: 15px;
}

.suggestion-alert {
  padding: 12px 16px; /* 调整 Alert 内边距 */
  border-radius: 6px;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .main-metric-card {
    padding: 20px 10px;
  }
  .metric-value {
    font-size: 2.2rem;
  }
  .secondary-metric-card {
    padding: 12px 15px;
  }
   .metric-value-small {
    font-size: 1.3rem;
  }
  .card-header {
    font-size: 1rem;
  }
  .posture-label {
    width: 80px; /* 移动端标签宽度 */
    margin-right: 10px;
    font-size: 0.85rem;
  }
  .progress-text {
    font-size: 0.85rem;
    margin-left: 8px;
    min-width: 30px;
  }
  .foot-strike-bar {
    height: 20px;
  }
  .foot-strike-legend {
    font-size: 0.85rem;
    gap: 10px;
  }
}

</style>

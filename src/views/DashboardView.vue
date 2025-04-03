<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { ArrowLeft } from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const navigateBack = () => {
  router.push({ name: 'home' });
};

// 评分颜色计算
const scoreColor = (score: number) => {
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
const suggestions = [
  "尝试提高步频至175-180步/分钟以提高效率",
  "保持上身稳定，减少左右摇摆",
  "略微增加前脚掌着地比例以改善冲击吸收",
  "保持手臂90度弯曲，手臂摆动与步频同步"
];
</script>

<template>
  <div class="dashboard-container">
    <div class="header">
      <el-button @click="navigateBack" icon="ArrowLeft" circle></el-button>
      <h1>实时跑步监测</h1>
      <div class="spacer"></div>
    </div>

    <div class="main-metrics">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-card class="metric-card">
            <template #header>
              <div class="card-header">
                <span>配速</span>
              </div>
            </template>
            <div class="metric-value">{{ runningData.pace.toFixed(1) }}</div>
            <div class="metric-unit">分钟/公里</div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="metric-card">
            <template #header>
              <div class="card-header">
                <span>心率</span>
              </div>
            </template>
            <div class="metric-value">{{ runningData.heartRate }}</div>
            <div class="metric-unit">次/分钟</div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="metric-card">
            <template #header>
              <div class="card-header">
                <span>步频</span>
              </div>
            </template>
            <div class="metric-value">{{ runningData.cadence }}</div>
            <div class="metric-unit">步/分钟</div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <div class="secondary-metrics">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="small-metric-card">
            <div class="small-metric-label">距离</div>
            <div class="small-metric-value">{{ runningData.distance.toFixed(2) }} 公里</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="small-metric-card">
            <div class="small-metric-label">时间</div>
            <div class="small-metric-value">{{ runningData.duration }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="small-metric-card">
            <div class="small-metric-label">卡路里</div>
            <div class="small-metric-value">{{ runningData.calories }} 千卡</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="small-metric-card">
            <div class="small-metric-label">综合评分</div>
            <div class="small-metric-value score">{{ Math.round(postureScores.overall) }}</div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <div class="analysis-section">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-card class="analysis-card">
            <template #header>
              <div class="card-header">
                <span>姿态评估</span>
              </div>
            </template>
            <div class="posture-scores">
              <div class="posture-item">
                <span class="posture-label">上身稳定性</span>
                <el-progress 
                  :percentage="postureScores.upperBody" 
                  :color="scoreColor(postureScores.upperBody)"
                  :stroke-width="10"
                ></el-progress>
              </div>
              <div class="posture-item">
                <span class="posture-label">手臂摆动</span>
                <el-progress 
                  :percentage="postureScores.armSwing" 
                  :color="scoreColor(postureScores.armSwing)"
                  :stroke-width="10"
                ></el-progress>
              </div>
              <div class="posture-item">
                <span class="posture-label">抬腿高度</span>
                <el-progress 
                  :percentage="postureScores.legLift" 
                  :color="scoreColor(postureScores.legLift)"
                  :stroke-width="10"
                ></el-progress>
              </div>
              <div class="posture-item">
                <span class="posture-label">足部着地</span>
                <el-progress 
                  :percentage="postureScores.footLanding" 
                  :color="scoreColor(postureScores.footLanding)"
                  :stroke-width="10"
                ></el-progress>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card class="analysis-card">
            <template #header>
              <div class="card-header">
                <span>足部着地方式</span>
              </div>
            </template>
            <div class="foot-strike">
              <el-row>
                <el-col :span="8" class="foot-strike-item">
                  <div class="foot-strike-percent">{{ Math.round(footStrikeData.forefoot) }}%</div>
                  <div class="foot-strike-label">前脚掌</div>
                </el-col>
                <el-col :span="8" class="foot-strike-item">
                  <div class="foot-strike-percent">{{ Math.round(footStrikeData.midfoot) }}%</div>
                  <div class="foot-strike-label">中脚掌</div>
                </el-col>
                <el-col :span="8" class="foot-strike-item">
                  <div class="foot-strike-percent">{{ Math.round(footStrikeData.rearfoot) }}%</div>
                  <div class="foot-strike-label">后脚掌</div>
                </el-col>
              </el-row>
              <div class="foot-strike-bar">
                <div 
                  class="foot-strike-forefoot" 
                  :style="{ width: footStrikeData.forefoot + '%' }"
                ></div>
                <div 
                  class="foot-strike-midfoot" 
                  :style="{ width: footStrikeData.midfoot + '%' }"
                ></div>
                <div 
                  class="foot-strike-rearfoot" 
                  :style="{ width: footStrikeData.rearfoot + '%' }"
                ></div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <div class="suggestions-section">
      <el-card>
        <template #header>
          <div class="card-header">
            <span>改进建议</span>
          </div>
        </template>
        <ul class="suggestion-list">
          <li v-for="(suggestion, index) in suggestions" :key="index">
            {{ suggestion }}
          </li>
        </ul>
      </el-card>
    </div>

    <div class="actions">
      <el-button type="danger" size="large">结束跑步</el-button>
      <el-button type="warning" size="large">暂停</el-button>
    </div>
  </div>
</template>

<style scoped>
.dashboard-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.header {
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
}

.header h1 {
  margin: 0 1rem;
  flex-grow: 1;
  text-align: center;
  color: var(--el-color-primary);
}

.spacer {
  width: 40px;
}

.main-metrics {
  margin-bottom: 1.5rem;
}

.metric-card {
  text-align: center;
  transition: transform 0.3s;
}

.metric-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-value {
  font-size: 2.5rem;
  font-weight: bold;
  color: var(--el-color-primary);
  margin: 0.5rem 0;
}

.metric-unit {
  color: var(--el-text-color-secondary);
  font-size: 0.9rem;
}

.secondary-metrics {
  margin-bottom: 1.5rem;
}

.small-metric-card {
  text-align: center;
  padding: 0.5rem;
}

.small-metric-label {
  font-size: 0.9rem;
  color: var(--el-text-color-secondary);
}

.small-metric-value {
  font-size: 1.2rem;
  font-weight: bold;
  margin-top: 0.3rem;
}

.small-metric-value.score {
  color: var(--el-color-success);
  font-size: 1.5rem;
}

.analysis-section {
  margin-bottom: 1.5rem;
}

.analysis-card {
  height: 100%;
}

.posture-scores {
  padding: 0.5rem;
}

.posture-item {
  margin-bottom: 1rem;
}

.posture-label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.foot-strike {
  padding: 0.5rem;
}

.foot-strike-item {
  text-align: center;
}

.foot-strike-percent {
  font-size: 1.5rem;
  font-weight: bold;
}

.foot-strike-label {
  font-size: 0.9rem;
  color: var(--el-text-color-secondary);
}

.foot-strike-bar {
  height: 20px;
  border-radius: 10px;
  display: flex;
  margin-top: 1rem;
  overflow: hidden;
}

.foot-strike-forefoot {
  background-color: #67c23a;
  height: 100%;
}

.foot-strike-midfoot {
  background-color: #e6a23c;
  height: 100%;
}

.foot-strike-rearfoot {
  background-color: #f56c6c;
  height: 100%;
}

.suggestions-section {
  margin-bottom: 1.5rem;
}

.suggestion-list {
  padding-left: 1.5rem;
}

.suggestion-list li {
  margin-bottom: 0.5rem;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
}
</style> 
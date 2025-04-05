<style>
/* 全局CSS变量 - 不使用scoped确保全局可用 */
:root {
  --light-bg-color: #f5f9ff;
  --light-card-bg: #fff;
  --light-text-primary: #303133;
  --light-text-secondary: #909399;
  --light-border-color: #ebeef5;
  --light-header-bg: #fff;

  --dark-bg-color: #1a1a1a;
  --dark-card-bg: #2a2a2a;
  --dark-text-primary: #e0e0e0;
  --dark-text-secondary: #aaaaaa;
  --dark-border-color: #3a3a3a;
  --dark-header-bg: #252525;
}
</style>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, reactive } from 'vue';
import { ArrowLeft, Stopwatch, Odometer, Aim, MagicStick, Warning, Cpu, Loading, Monitor } from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';
import { useAppModeStore } from '@/stores/appMode';
import * as AIAdapter from '@/ai/adapter';
import { ModelStatus } from '@/ai/types';

const router = useRouter();
const appModeStore = useAppModeStore();

// 检查当前模式
const isAiMode = computed(() => appModeStore.isAiMode());

// 定时器变量初始化
let dataUpdateInterval: number | null = null;
let suggestionInterval: number | null = null;
let confidenceInterval: number | null = null;
let modelUpdateInterval: number | null = null;

// 页面状态
const pageState = reactive({
  aiModelLoaded: false,
  aiModelLoading: false,
  aiModelError: false,
  dataCollectionStarted: false,
  confidenceLevel: 0,
});

// AI引擎状态
const aiStatus = ref({
  initialized: false,
  running: false,
  modelStatus: ModelStatus.INACTIVE,
  dataCount: 0
});

// 是否显示AI引擎详情面板
const showAIDetails = ref(false);

// AI引擎信息
const aiInfo = ref({
  version: '',
  description: '',
  supportedFeatures: {}
});

// AI分析结果
const aiAnalysisResult = ref<any>(null);
const aiSuggestions = ref<any[]>([
  { type: 'success', text: "AI分析：您的上半身稳定性较好，继续保持" },
  { type: 'warning', text: "AI分析：检测到轻微足外翻，建议调整足部着地" },
  { type: 'info', text: "AI分析：垂直振幅处于正常范围，能量效率良好" },
  { type: 'warning', text: "AI分析：步态周期中支撑相时间略长，尝试提高步频" },
  { type: 'success', text: "AI分析：手臂摆动幅度适中，与步频同步良好" }
]);

// AI模型加载
const loadAiModel = () => {
  if (isAiMode.value && !pageState.aiModelLoaded && !pageState.aiModelLoading) {
    pageState.aiModelLoading = true;

    // 模拟AI模型加载过程
    setTimeout(() => {
      pageState.aiModelLoaded = true;
      pageState.aiModelLoading = false;
      pageState.confidenceLevel = 85; // 初始置信度
    }, 2500);
  }
};

// 初始化AI引擎
const initAI = async () => {
  if (isAiMode.value) {
    const success = await AIAdapter.initializeAI(true); // 启用调试模式
    if (success) {
      aiInfo.value.version = AIAdapter.getAIVersion();
      aiInfo.value.description = AIAdapter.getAIDescription();
      aiInfo.value.supportedFeatures = AIAdapter.getSupportedFeatures();
      updateAIStatus();
    }
  }
};

// 更新AI状态
const updateAIStatus = () => {
  aiStatus.value = AIAdapter.getAIStatus();
};

// 处理AI分析结果更新
const handleAIAnalysisUpdate = (result: any) => {
  // 直接使用AI引擎的分析结果
  aiAnalysisResult.value = result.analysis;

  // 使用AI引擎生成的建议
  const newSuggestions = result.suggestions.map((suggestion: any) => {
    // 将AI引擎的建议转换为UI可显示的格式
    let type = 'info';
    if (suggestion.priority >= 8) {
      type = 'warning';
    } else if (suggestion.priority <= 3) {
      type = 'success';
    }

    return {
      type,
      text: `AI分析：${suggestion.text}`
    };
  });

  // 更新建议列表
  aiSuggestions.value = newSuggestions.length > 0 ? newSuggestions : [
    { type: 'info', text: 'AI分析：数据采集中，请保持正常跑步姿势...' }
  ];

  // 更新异常模式
  if (result.analysis && result.analysis.abnormalities) {
    aiAnalysisData.value.abnormalPatterns = result.analysis.abnormalities.map((abnormality: string) => {
      // 将异常ID转换为用户友好的文本
      const abnormalityMap: Record<string, string> = {
        'OVERPRONATION': '过度内翻',
        'OVERSUPINATION': '过度外翻',
        'VERTICAL_OSCILLATION': '垂直振幅过大',
        'CADENCE_IRREGULARITY': '步频不稳定',
        'TRUNK_LEAN': '上身前倾过大',
        'OVERSTRIDING': '步幅过大',
        'ARM_SWING': '手臂摆动异常',
        'CROSSOVER_GAIT': '交叉步态',
        'KNEE_COLLAPSE': '膝盖内扣'
      };

      return abnormalityMap[abnormality] || abnormality;
    });
  }

  // 更新评分
  if (result.analysis && result.analysis.scores) {
    const scores = result.analysis.scores;
    // 这里根据AI引擎返回的评分更新UI显示的评分
    if (scores.efficiency !== undefined) {
      postureScores.value.upperBody = Math.round(scores.efficiency);
    }
    if (scores.stability !== undefined) {
      postureScores.value.legLift = Math.round(scores.stability);
    }
    if (scores.impact !== undefined) {
      postureScores.value.footLanding = Math.round(scores.impact);
    }
    if (scores.overall !== undefined) {
      postureScores.value.overall = Math.round(scores.overall);
      runningData.value.score = Math.round(scores.overall);
    }
  }
};

// 启动/停止AI分析
let unsubscribeAIUpdateListener: (() => void) | null = null;

const startAIAnalysis = () => {
  if (isAiMode.value && aiStatus.value.initialized) {
    // 注册分析结果监听
    unsubscribeAIUpdateListener = AIAdapter.onAnalysisUpdate(handleAIAnalysisUpdate);
    // 启动分析
    AIAdapter.startAnalysis();
    // 更新状态
    updateAIStatus();
  }
};

const stopAIAnalysis = () => {
  if (isAiMode.value && aiStatus.value.running) {
    // 停止分析
    AIAdapter.stopAnalysis();
    // 取消监听
    if (unsubscribeAIUpdateListener) {
      unsubscribeAIUpdateListener();
      unsubscribeAIUpdateListener = null;
    }
    // 更新状态
    updateAIStatus();
  }
};

// 启动数据采集，修改为同时启动AI分析
const startDataCollection = () => {
  if (pageState.dataCollectionStarted) return; // 防止重复启动

  pageState.dataCollectionStarted = true;
  console.log('数据采集已启动');

  // 如果是AI模式，启动AI分析
  if (isAiMode.value) {
    startAIAnalysis();

    // 模拟数据也保留，用于UI显示
    confidenceInterval = window.setInterval(() => {
      // 模拟置信度波动
      pageState.confidenceLevel = Math.max(75, Math.min(98, pageState.confidenceLevel + (Math.random() - 0.5) * 5));
    }, 3000);
  }

  // 启动数据更新
  startDataUpdate();
};

// 停止数据采集，修改为同时停止AI分析
const stopDataCollection = () => {
  if (!pageState.dataCollectionStarted) return; // 防止重复停止

  pageState.dataCollectionStarted = false;
  console.log('数据采集已停止');

  // 如果是AI模式，停止AI分析
  if (isAiMode.value) {
    stopAIAnalysis();
  }

  clearAllIntervals();
};

// 清除所有定时器
const clearAllIntervals = () => {
  if (dataUpdateInterval !== null) {
    clearInterval(dataUpdateInterval);
    dataUpdateInterval = null;
  }
  if (suggestionInterval !== null) {
    clearInterval(suggestionInterval);
    suggestionInterval = null;
  }
  if (confidenceInterval !== null) {
    clearInterval(confidenceInterval);
    confidenceInterval = null;
  }
  if (modelUpdateInterval !== null) {
    clearInterval(modelUpdateInterval);
    modelUpdateInterval = null;
  }
};

// 处理接收到的传感器数据，添加到AI引擎
const handleSocketData = (data: any) => {
  // 添加到AI引擎
  if (isAiMode.value && aiStatus.value.initialized && aiStatus.value.running) {
    const sensorData = AIAdapter.convertServerDataToSensorData(data);
    AIAdapter.addData(sensorData);
  }

  // 其他数据处理保持不变...
};

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

// AI分析数据
const aiAnalysisData = ref({
  detectedKeyPoints: 17, // 检测到的关键点数量
  framerate: 27, // 分析帧率
  processingTime: 32, // 处理时间 (毫秒)
  abnormalPatterns: [] as string[], // 检测到的异常模式
});

// 模拟异常模式检测
const possibleAbnormalPatterns = [
  "过度外翻",
  "膝盖内扣",
  "步幅不稳定",
  "垂直振幅过大",
  "上身摇摆",
  "手臂摆动过大"
];

// 启动数据更新
const startDataUpdate = () => {
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

    // 如果是AI模式，更新AI分析数据
    if (isAiMode.value) {
      aiAnalysisData.value.framerate = Math.max(24, Math.min(30, aiAnalysisData.value.framerate + Math.floor((Math.random() - 0.5) * 2)));
      aiAnalysisData.value.processingTime = Math.max(28, Math.min(38, aiAnalysisData.value.processingTime + Math.floor((Math.random() - 0.5) * 3)));

      // 每15秒随机检测一个异常模式
      if (Math.random() > 0.93 && aiAnalysisData.value.abnormalPatterns.length < 2) {
        const newPattern = possibleAbnormalPatterns[Math.floor(Math.random() * possibleAbnormalPatterns.length)];
        if (!aiAnalysisData.value.abnormalPatterns.includes(newPattern)) {
          aiAnalysisData.value.abnormalPatterns.push(newPattern);
        }
      }

      // 随机清除某个异常模式
      if (Math.random() > 0.95 && aiAnalysisData.value.abnormalPatterns.length > 0) {
        const indexToRemove = Math.floor(Math.random() * aiAnalysisData.value.abnormalPatterns.length);
        aiAnalysisData.value.abnormalPatterns.splice(indexToRemove, 1);
      }
    }
  }, 1000);

  // 启动建议轮播
  startSuggestionCarousel();
};

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
  if (isAiMode.value && pageState.aiModelLoaded) {
    return aiSuggestions.value[currentSuggestionIndex.value % aiSuggestions.value.length];
  }
  return suggestions.value[currentSuggestionIndex.value % suggestions.value.length];
});

// 启动建议轮播
const startSuggestionCarousel = () => {
  suggestionInterval = window.setInterval(() => {
    currentSuggestionIndex.value = (currentSuggestionIndex.value + 1) %
      (isAiMode.value ? aiSuggestions.value.length : suggestions.value.length);
  }, 5000); // 每5秒切换一次建议
};

// 主题模式
const isDarkMode = ref(isAiMode.value);

// 切换主题 - 修复版本
const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value;

  // 使用Vue响应式数据绑定样式
  const themeVariables = isDarkMode.value
    ? {
        '--el-bg-color': '#1a1a1a',
        '--el-bg-color-overlay': '#2a2a2a',
        '--el-text-color-primary': '#e0e0e0',
        '--el-text-color-regular': '#aaaaaa',
        '--el-border-color-light': '#3a3a3a',
        '--el-border-color-lighter': '#3a3a3a',
        '--el-fill-color-blank': '#2a2a2a',
        '--el-border-color': '#444',
        '--el-switch-on-color': '#409eff',
        '--el-switch-off-color': '#555',
      }
    : {
        '--el-bg-color': '',
        '--el-bg-color-overlay': '',
        '--el-text-color-primary': '',
        '--el-text-color-regular': '',
        '--el-border-color-light': '',
        '--el-border-color-lighter': '',
        '--el-fill-color-blank': '',
        '--el-border-color': '',
        '--el-switch-on-color': '',
        '--el-switch-off-color': '',
      };

  Object.entries(themeVariables).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });

  console.log('主题已切换为:', isDarkMode.value ? '深色' : '浅色');
};

// 根据模式获取CSS类
const getThemeClass = computed(() => {
  return isDarkMode.value ? 'dark-theme' : 'light-theme';
});

// 生命周期钩子
onMounted(async () => {
  // 初始化主题
  if (isDarkMode.value) {
    toggleTheme();
    toggleTheme();
  }

  // 如果是AI模式，初始化AI引擎
  if (isAiMode.value) {
    await initAI();

    // 原有的模型加载逻辑保留，作为UI展示部分
    loadAiModel();

    // 模拟模型参数更新
    modelUpdateInterval = window.setInterval(() => {
      // 模拟模型参数调整
      if (pageState.aiModelLoaded && pageState.dataCollectionStarted) {
        aiAnalysisData.value.detectedKeyPoints = Math.max(15, Math.min(17, aiAnalysisData.value.detectedKeyPoints + (Math.random() > 0.7 ? -1 : (Math.random() > 0.7 ? 1 : 0))));
      }

      // 更新AI状态
      updateAIStatus();
    }, 3000);
  }
});

onUnmounted(async () => {
  clearAllIntervals();

  if (isAiMode.value && unsubscribeAIUpdateListener) {
    unsubscribeAIUpdateListener();
  }

  if (isAiMode.value && aiStatus.value.initialized) {
    await AIAdapter.disposeAI();
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
  <div class="dashboard-view" :class="getThemeClass">
    <el-page-header @back="navigateBack" class="page-header">
      <template #content>
        <div class="page-header-content">
          <span class="text-large font-600 mr-3"> 实时跑步监测 </span>
          <el-tag v-if="isAiMode" type="success" effect="dark" size="small" class="ai-mode-tag">
            <el-icon><Cpu /></el-icon>
            AI引擎模式
          </el-tag>
          <el-tag v-else type="info" effect="plain" size="small">模拟数据模式</el-tag>
        </div>
      </template>
      <template #extra>
        <el-switch
          v-model="isDarkMode"
          active-text="深色模式"
          inactive-text="浅色模式"
          inline-prompt
          @change="toggleTheme"
        />
      </template>
    </el-page-header>

    <!-- AI模型加载状态 -->
    <div v-if="isAiMode && !pageState.aiModelLoaded" class="ai-model-loading">
      <el-card shadow="never" class="ai-loading-card">
        <div class="ai-loading-content">
          <el-icon class="is-loading loading-icon"><Loading /></el-icon>
          <h3>正在加载AI分析引擎...</h3>
          <el-progress :percentage="95" status="success" :duration="2.5" :striped="true" :stroke-width="15" />
          <p class="loading-desc">正在初始化TensorFlow Lite运行时环境和加载姿态分析模型</p>
        </div>
      </el-card>
    </div>

    <!-- 数据采集控制 -->
    <div v-if="!pageState.dataCollectionStarted && (!isAiMode || (isAiMode && pageState.aiModelLoaded))" class="data-collection-start">
      <el-card shadow="hover" class="collection-start-card">
        <div class="collection-start-content">
          <el-icon :size="48" class="collection-icon" :class="{'ai-icon': isAiMode}">
            <component :is="isAiMode ? Cpu : Monitor" />
          </el-icon>
          <h2>准备就绪</h2>
          <p>{{ isAiMode ? 'AI分析引擎已加载完成，点击开始采集数据并实时分析' : '系统已准备就绪，点击开始使用模拟数据进行演示' }}</p>
          <el-button type="primary" size="large" @click="startDataCollection" class="start-button">
            开始采集数据
          </el-button>
        </div>
      </el-card>
    </div>

    <!-- 主界面内容 -->
    <div v-if="pageState.dataCollectionStarted" class="dashboard-content">
      <!-- AI模式指示器 -->
      <div v-if="isAiMode" class="ai-status-indicator">
        <el-card shadow="hover" class="ai-status-card">
          <template #header>
            <div class="card-header">
              <span>AI引擎状态</span>
              <el-tag type="success" effect="dark" size="small">运行中</el-tag>
            </div>
          </template>
          <div class="ai-status-content">
            <div class="ai-status-item">
              <span class="status-label">模型置信度</span>
              <el-progress
                :percentage="pageState.confidenceLevel"
                :color="pageState.confidenceLevel > 85 ? '#67c23a' : '#e6a23c'"
                :format="() => pageState.confidenceLevel.toFixed(1) + '%'"
                :stroke-width="12"
              />
            </div>
            <div class="ai-metrics">
              <div class="ai-metric-item">
                <div class="metric-value">{{ aiAnalysisData.detectedKeyPoints }}</div>
                <div class="metric-label">关键点</div>
              </div>
              <div class="ai-metric-item">
                <div class="metric-value">{{ aiAnalysisData.framerate }} fps</div>
                <div class="metric-label">帧率</div>
              </div>
              <div class="ai-metric-item">
                <div class="metric-value">{{ aiAnalysisData.processingTime }} ms</div>
                <div class="metric-label">处理时间</div>
              </div>
            </div>
            <div v-if="aiAnalysisData.abnormalPatterns.length > 0" class="abnormal-patterns">
              <div class="patterns-label">检测到的异常模式:</div>
              <el-tag
                v-for="(pattern, index) in aiAnalysisData.abnormalPatterns"
                :key="index"
                type="warning"
                effect="dark"
                class="abnormal-tag"
              >
                {{ pattern }}
              </el-tag>
            </div>
          </div>
        </el-card>
      </div>

      <!-- 停止数据采集按钮 -->
      <div class="stop-collection">
        <el-button type="danger" size="small" @click="stopDataCollection" plain round>
          <el-icon><Warning /></el-icon>
          停止数据采集
        </el-button>
      </div>

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
                <span>{{ isAiMode ? 'AI实时建议' : '实时建议' }}</span>
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
  </div>
</template>

<style scoped>
/* 明暗主题样式 */
.light-theme {
  --bg-color: var(--light-bg-color);
  --card-bg: var(--light-card-bg);
  --text-primary: var(--light-text-primary);
  --text-secondary: var(--light-text-secondary);
  --border-color: var(--light-border-color);
  --header-bg: var(--light-header-bg);
}

.dark-theme {
  --bg-color: var(--dark-bg-color);
  --card-bg: var(--dark-card-bg);
  --text-primary: var(--dark-text-primary);
  --text-secondary: var(--dark-text-secondary);
  --border-color: var(--dark-border-color);
  --header-bg: var(--dark-header-bg);
}

/* 基础布局样式 */
.dashboard-view {
  padding: 20px;
  background-color: var(--bg-color);
  min-height: 100vh;
  transition: all 0.3s ease;
}

.page-header {
  margin-bottom: 25px;
  background-color: var(--header-bg);
  padding: 15px 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.page-header-content {
  display: flex;
  align-items: center;
}

.text-large {
  font-size: 1.25rem;
  color: var(--text-primary);
}

.ai-mode-tag {
  margin-left: 10px;
  display: flex;
  align-items: center;
}

.ai-mode-tag .el-icon {
  margin-right: 4px;
}

/* AI模型加载样式 */
.ai-model-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
}

.ai-loading-card {
  width: 500px;
  max-width: 90%;
  text-align: center;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
}

.ai-loading-content {
  padding: 30px;
}

.loading-icon {
  font-size: 48px;
  color: var(--el-color-primary);
  margin-bottom: 20px;
}

.ai-loading-content h3 {
  font-size: 1.5rem;
  margin-bottom: 25px;
  color: var(--text-primary);
}

.loading-desc {
  color: var(--text-secondary);
  margin-top: 15px;
}

/* 数据采集控制样式 */
.data-collection-start {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
}

.collection-start-card {
  width: 500px;
  max-width: 90%;
  text-align: center;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
}

.collection-start-content {
  padding: 40px 30px;
}

.collection-icon {
  font-size: 48px;
  color: var(--el-color-primary);
  margin-bottom: 20px;
}

.ai-icon {
  color: var(--el-color-success);
}

.collection-start-content h2 {
  font-size: 1.8rem;
  margin-bottom: 15px;
  color: var(--text-primary);
}

.collection-start-content p {
  color: var(--text-secondary);
  margin-bottom: 30px;
  font-size: 1.1rem;
}

.start-button {
  padding: 12px 30px;
  font-size: 1.1rem;
}

/* 停止数据采集按钮 */
.stop-collection {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 100;
}

/* AI状态指示器样式 */
.ai-status-indicator {
  margin-bottom: 20px;
}

.ai-status-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
}

.ai-status-content {
  padding: 10px 0;
}

.ai-status-item {
  margin-bottom: 15px;
}

.status-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary);
}

.ai-metrics {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

.ai-metric-item {
  text-align: center;
  flex: 1;
}

.metric-value {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--el-color-primary);
  margin-bottom: 5px;
}

.metric-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.abnormal-patterns {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px dashed var(--border-color);
}

.patterns-label {
  color: var(--text-secondary);
  margin-bottom: 10px;
  font-size: 0.9rem;
}

.abnormal-tag {
  margin-right: 8px;
  margin-bottom: 8px;
}

/* 仪表板内容 */
.dashboard-content {
  margin-top: 20px;
}

/* 卡片基础样式 */
.metric-card {
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 20px;
  transition: all 0.3s ease;
  border: none;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
  background-color: var(--card-bg);
}

.metric-card:hover {
   transform: translateY(-5px);
   box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
}

/* Main Metrics */
.main-metrics {
  margin-bottom: 15px;
}

.main-metric-card {
  text-align: center;
  padding: 25px 15px;
  background: linear-gradient(135deg, var(--card-bg), var(--card-bg));
}

.pace-card { border-left: 5px solid var(--el-color-primary); }
.hr-card { border-left: 5px solid var(--el-color-danger); }
.cadence-card { border-left: 5px solid var(--el-color-success); }

.metric-value {
  font-size: 2.8rem;
  font-weight: bold;
  line-height: 1.2;
  margin-bottom: 5px;
  color: var(--text-primary);
}

.pace-card .metric-value { color: var(--el-color-primary); }
.hr-card .metric-value { color: var(--el-color-danger); }
.cadence-card .metric-value { color: var(--el-color-success); }

.metric-label {
  font-size: 1rem;
  color: var(--text-secondary);
}

.metric-unit {
  font-size: 0.85rem;
  margin-left: 3px;
}

/* Secondary Metrics */
.secondary-metrics {
  margin-bottom: 15px;
}

.secondary-metric-card {
  display: flex;
  align-items: center;
  padding: 15px 20px;
  background-color: var(--card-bg);
}

.metric-icon {
  margin-right: 15px;
  color: var(--el-color-primary);
}

.metric-info {
  flex-grow: 1;
}

.metric-value-small {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
}

.score-value {
   font-weight: bold;
}

.metric-label-small {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* Analysis Section */
.analysis-section {
  margin-top: 15px;
}

.analysis-card {
  border-radius: 12px;
  margin-bottom: 20px;
  border: 1px solid var(--border-color);
  background-color: var(--card-bg);
}

/* 重写 Card Header 样式 */
:deep(.analysis-card .el-card__header) {
  background-color: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
  padding: 12px 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.card-header .el-icon {
  color: var(--el-color-primary);
}

/* Posture Scores */
.posture-card :deep(.el-card__body) {
  padding-top: 15px;
  padding-bottom: 15px;
}

.posture-item {
  display: flex;
  align-items: center;
  margin-bottom: 18px;
}

.posture-item:last-child {
  margin-bottom: 0;
}

.posture-label {
  width: 90px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-right: 15px;
  text-align: right;
  flex-shrink: 0;
}

/* Progress bar styles */
.posture-progress {
  flex-grow: 1;
  display: flex;
  align-items: center;
}

:deep(.posture-progress .el-progress__text) {
  display: none;
}

:deep(.posture-progress .el-progress-bar__outer) {
  border-radius: 8px;
  background-color: rgba(var(--el-color-primary-rgb), 0.2);
}

:deep(.posture-progress .el-progress-bar__inner) {
  border-radius: 8px;
}

.progress-text {
  font-size: 0.9rem;
  color: var(--text-primary);
  font-weight: 600;
  margin-left: 10px;
  min-width: 35px;
  text-align: right;
}

/* Foot Strike */
.foot-strike-card :deep(.el-card__body) {
  padding: 20px;
}

.foot-strike-bar {
  display: flex;
  height: 25px;
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
  position: relative;
}

.strike-segment.forefoot { background-color: #E6A23C; }
.strike-segment.midfoot { background-color: #67C23A; }
.strike-segment.rearfoot { background-color: #F56C6C; }

.foot-strike-legend {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 15px;
  font-size: 0.9rem;
  color: var(--text-secondary);
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
  padding: 12px 16px;
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
    width: 80px;
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
  .ai-metrics {
    flex-wrap: wrap;
  }
  .ai-metric-item {
    width: 33%;
    margin-bottom: 15px;
  }
}
</style>

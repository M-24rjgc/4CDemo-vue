<template>
  <div class="analysis-view">
    <!-- Page Header Card -->
    <el-card class="page-header-card" shadow="never">
      <div class="header-content">
        <h1 class="page-title">深度分析</h1>
        <div class="session-selector">
          <el-select
             v-model="selectedSession"
             placeholder="选择要分析的训练记录"
             @change="loadSessionData"
             filterable
             clearable
             style="width: 300px;"
           >
            <el-option
              v-for="item in sessionOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
             <template #empty>
               <el-empty description="暂无历史记录可供分析" :image-size="60"></el-empty>
             </template>
          </el-select>
        </div>
      </div>
    </el-card>

    <!-- Analysis Content -->
    <div v-if="selectedSession && !loading" class="analysis-content">
      <!-- Overview Section -->
      <el-card class="analysis-section-card overview-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span><el-icon><DataAnalysis /></el-icon> 综合评估</span>
            <!-- Add more controls if needed -->
          </div>
        </template>
        <el-row :gutter="30">
          <el-col :xs="24" :md="8" class="radar-chart-col">
            <div class="chart-wrapper overview-chart" ref="radarChartRef"></div>
          </el-col>
          <el-col :xs="24" :md="16">
            <div class="overview-summary">
              <h3 class="summary-title">训练总结</h3>
              <p class="summary-text">{{ analysisData.summary }}</p>

              <h3 class="summary-title">核心指标</h3>
              <el-descriptions :column="isMobile ? 1 : 3" border size="small" class="overview-metrics">
                <el-descriptions-item label="平均步频">
                   <el-tag type="success" size="small">{{ analysisData.metrics?.avgCadence || '--' }} <span class="unit">步/分</span></el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="平均步幅">
                   <el-tag type="primary" size="small">{{ analysisData.metrics?.avgStride || '--' }} <span class="unit">厘米</span></el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="姿态评分">
                   <el-tag :type="getScoreTagType(analysisData.metrics?.postureScore)" size="small">{{ analysisData.metrics?.postureScore || '--' }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="着地方式">
                  <el-tag size="small">{{ analysisData.metrics?.landingPattern || '--' }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="垂直振幅">
                   <el-tag type="warning" size="small">{{ analysisData.metrics?.verticalOscillation || '--' }} <span class="unit">厘米</span></el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="触地时间">
                   <el-tag type="danger" size="small">{{ analysisData.metrics?.groundContactTime || '--' }} <span class="unit">毫秒</span></el-tag>
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </el-col>
        </el-row>
      </el-card>

      <!-- Detailed Analysis Section -->
      <el-row :gutter="24" class="detail-analysis-row">
        <!-- Gait Analysis -->
        <el-col :xs="24" :lg="12">
          <el-card class="analysis-section-card gait-card" shadow="never">
            <template #header>
              <div class="card-header">
                 <span><el-icon><Guide /></el-icon> 步态分析</span>
              </div>
            </template>
            <div class="analysis-content-wrapper">
               <div class="chart-wrapper gait-chart" ref="gaitChartRef"></div>
               <div class="analysis-description">
                 <h3 class="description-title">步态周期</h3>
                 <p class="description-text">{{ analysisData.gaitAnalysis?.description }}</p>
                 <div class="phase-analysis">
                   <div class="phase-item">
                     <div class="phase-title">
                       <span class="phase-dot support"></span>
                       <span>支撑相</span>
                     </div>
                     <div class="phase-value">{{ analysisData.gaitAnalysis?.supportPhase || '--' }}</div>
                   </div>
                   <el-divider direction="vertical" />
                   <div class="phase-item">
                     <div class="phase-title">
                       <span class="phase-dot flight"></span>
                       <span>摆动相</span>
                     </div>
                     <div class="phase-value">{{ analysisData.gaitAnalysis?.flightPhase || '--' }}</div>
                   </div>
                 </div>
               </div>
            </div>
          </el-card>
        </el-col>

        <!-- Pressure Analysis -->
        <el-col :xs="24" :lg="12">
          <el-card class="analysis-section-card pressure-card" shadow="never">
            <template #header>
              <div class="card-header">
                 <span><el-icon><Place /></el-icon> 足压分析</span>
              </div>
            </template>
             <div class="analysis-content-wrapper">
               <div class="chart-wrapper pressure-map" ref="pressureMapRef"></div>
               <div class="analysis-description">
                 <h3 class="description-title">足压分布</h3>
                 <p class="description-text">{{ analysisData.pressureAnalysis?.description }}</p>
                  <div class="pressure-stats">
                     <el-tooltip :content="`前脚掌: ${analysisData.pressureAnalysis?.forefoot || 0}%`" placement="top">
                       <el-progress
                         :percentage="analysisData.pressureAnalysis?.forefoot || 0"
                         :stroke-width="18"
                         :color="pressureColors.forefoot"
                         :text-inside="true"
                       >
                         <span>前</span>
                       </el-progress>
                     </el-tooltip>
                     <el-tooltip :content="`中脚掌: ${analysisData.pressureAnalysis?.midfoot || 0}%`" placement="top">
                       <el-progress
                         :percentage="analysisData.pressureAnalysis?.midfoot || 0"
                         :stroke-width="18"
                         :color="pressureColors.midfoot"
                          :text-inside="true"
                       >
                          <span>中</span>
                       </el-progress>
                      </el-tooltip>
                     <el-tooltip :content="`后脚掌: ${analysisData.pressureAnalysis?.rearfoot || 0}%`" placement="top">
                        <el-progress
                          :percentage="analysisData.pressureAnalysis?.rearfoot || 0"
                          :stroke-width="18"
                          :color="pressureColors.rearfoot"
                           :text-inside="true"
                        >
                           <span>后</span>
                        </el-progress>
                     </el-tooltip>
                 </div>
               </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- Recommendations Section -->
      <el-card class="analysis-section-card recommendation-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span><el-icon><Opportunity /></el-icon> 改进建议</span>
          </div>
        </template>
        <div class="recommendations">
          <el-empty v-if="!analysisData.recommendations?.length" description="本次训练表现优异，暂无特别建议" :image-size="100" />
          <el-collapse v-else accordion v-model="activeRecommendation">
            <el-collapse-item
              v-for="(item, index) in analysisData.recommendations"
              :key="index"
              :name="index"
              class="recommendation-item"
            >
              <template #title>
                 <span class="recommendation-title">
                   <el-icon><Reading /></el-icon>
                   {{ item.title }}
                 </span>
              </template>
              <div class="recommendation-content">
                <p class="recommendation-description">{{ item.description }}</p>
                <div class="recommendation-exercises" v-if="item.exercises?.length">
                  <h4 class="exercises-title">推荐练习:</h4>
                  <ul class="exercises-list">
                    <li v-for="(exercise, i) in item.exercises" :key="i">
                       <el-icon><CircleCheck /></el-icon> {{ exercise }}
                    </li>
                  </ul>
                </div>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </el-card>
    </div>

     <!-- Loading or Empty State -->
     <div v-else class="placeholder-container">
        <el-empty
          v-if="loading"
          description="正在加载分析数据..."
          :image-size="150"
        >
            <template #image>
               <div class="loading-animation"></div>
            </template>
        </el-empty>
        <el-empty
          v-else
          description="请先从上方选择一个训练记录进行分析"
          :image-size="150"
        ></el-empty>
     </div>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed, nextTick } from 'vue'
import * as echarts from 'echarts'
import { DataAnalysis, Guide, Place, Opportunity, Reading, CircleCheck } from '@element-plus/icons-vue' // Import icons
import { useElementSize } from '@vueuse/core' // Use vueuse for responsiveness

// Loading state
const loading = ref(false)

// Session selection
const sessionOptions = ref([
  { value: 'session_1', label: '2023-03-28 晨跑 (40分钟)' },
  { value: 'session_2', label: '2023-03-25 间歇跑 (35分钟)' },
  { value: 'session_3', label: '2023-03-20 长跑 (60分钟)' },
  { value: 'session_4', label: '2023-03-15 恢复跑 (30分钟)' }
])
const selectedSession = ref<string | null>(null)

// Chart references
const radarChartRef = ref<HTMLElement | null>(null)
const gaitChartRef = ref<HTMLElement | null>(null)
const pressureMapRef = ref<HTMLElement | null>(null)

// Chart instances
let radarChart: echarts.ECharts | null = null
let gaitChart: echarts.ECharts | null = null
let pressureMap: echarts.ECharts | null = null

// Analysis data structure
const analysisData = reactive<any>({
  summary: '',
  metrics: null,
  gaitAnalysis: null,
  pressureAnalysis: null,
  recommendations: []
})

// Active recommendation panel
const activeRecommendation = ref(0); // Open the first one by default

// Responsive Design Helper
const { width } = useElementSize(document.body)
const isMobile = computed(() => width.value < 768)

// Pressure colors
const pressureColors = {
  forefoot: '#F56C6C', // Red
  midfoot: '#409EFF',  // Blue
  rearfoot: '#67C23A'  // Green
}

// Mock data fetching function
const mockFetchAnalysisData = (sessionId: string) => {
  return new Promise<any>((resolve) => {
    loading.value = true
    console.log(`Fetching analysis for session: ${sessionId}`)
    setTimeout(() => {
      // Simulate different data based on session ID
      const baseScore = 70 + Math.random() * 25
      const data = {
         summary: `本次训练 (${sessionId}) 整体表现${baseScore > 80 ? '良好' : '一般'}，步频保持稳定 (${170 + Math.floor(Math.random()*10)}步/分)，姿态评分为${baseScore.toFixed(0)}分。着地方式为${Math.random() > 0.4 ? '中足着地' : '后足跟着地'}，垂直振幅控制在适当范围内。${baseScore < 75 ? '建议关注足部外翻过度的问题。' : '继续保持！'}`,
        metrics: {
          avgCadence: 170 + Math.floor(Math.random()*10),
          avgStride: 110 + Math.floor(Math.random()*15),
          postureScore: parseFloat(baseScore.toFixed(0)),
          landingPattern: Math.random() > 0.4 ? '中足着地' : '后足跟着地',
          verticalOscillation: (8 + Math.random()*2).toFixed(1),
          groundContactTime: 210 + Math.floor(Math.random()*30)
        },
        gaitAnalysis: {
          description: '步态周期分析显示支撑相与摆动相比例适中，步态节奏均匀稳定。支撑相时间在理想范围内，摆动相展现出良好的弹性。',
          supportPhase: `${210 + Math.floor(Math.random()*20)}毫秒 (${(35 + Math.random()*5).toFixed(0)}%)`,
          flightPhase: `${350 + Math.floor(Math.random()*30)}毫秒 (${(65 - Math.random()*5).toFixed(0)}%)`,
        },
        pressureAnalysis: {
          description: '足压分布以中前脚掌为主，外侧压力略大。前后足压比例符合当前着地模式。',
          forefoot: 35 + Math.random() * 20,
          midfoot: 30 + Math.random() * 15,
          rearfoot: 25 + Math.random() * 10 // Will recalculate percentages later
        },
        recommendations: [
          {
            title: '改善足部外翻',
            description: '根据数据分析，您的足部在支撑相有轻微的外翻现象，长期可能导致胫骨内侧应力综合征。建议通过强化内侧肌群和改进着地技术来纠正。',
            exercises: [
              '单腿平衡练习 (每侧30秒，3组)',
              '内侧抗阻训练 (每侧15次，3组)',
              '赤足短距离慢跑，注意足部感受'
            ]
          },
          // Conditionally add more recommendations
          ...(baseScore < 80 ? [{
            title: '优化步频',
            description: '您的平均步频略低于最佳范围(175-185步/分钟)。提高步频可减少冲击力并改善跑步经济性。',
            exercises: [
              '节拍器训练 (设置180BPM，跟随节奏跑步)',
              '高抬腿练习 (30秒，4组)'
            ]
          }] : []),
          ...(Math.random() > 0.6 ? [{
            title: '核心肌群强化',
            description: '分析显示在长时间跑步后，您的躯干稳定性略有下降，这会影响整体姿态和能量消耗。建议强化核心肌群以提高稳定性。',
            exercises: [
              '平板支撑 (60秒，3组)',
              '死虫动作 (15次，3组)'
            ]
          }] : [])
        ]
      }
       // Recalculate pressure percentages to sum to 100
       const totalPressure = data.pressureAnalysis.forefoot + data.pressureAnalysis.midfoot + data.pressureAnalysis.rearfoot
       data.pressureAnalysis.forefoot = parseFloat(((data.pressureAnalysis.forefoot / totalPressure) * 100).toFixed(1))
       data.pressureAnalysis.midfoot = parseFloat(((data.pressureAnalysis.midfoot / totalPressure) * 100).toFixed(1))
       // Ensure it sums to 100
       data.pressureAnalysis.rearfoot = parseFloat((100 - data.pressureAnalysis.forefoot - data.pressureAnalysis.midfoot).toFixed(1))

      resolve(data)
      loading.value = false
    }, 1200) // Simulate network delay
  })
}

// Load session data and initialize charts
const loadSessionData = async (sessionId: string | null) => {
  if (!sessionId) {
     Object.assign(analysisData, { summary: '', metrics: null, gaitAnalysis: null, pressureAnalysis: null, recommendations: [] }) // Clear data
     // Optionally dispose charts
     radarChart?.clear()
     gaitChart?.clear()
     pressureMap?.clear()
    return
  }
  const data = await mockFetchAnalysisData(sessionId)
  Object.assign(analysisData, data) // Update reactive object
  activeRecommendation.value = 0 // Reset collapse

  // Initialize charts after data is loaded
  nextTick(() => {
    initRadarChart()
    initGaitChart()
    initPressureMap()
  })
}

// Get score tag type
const getScoreTagType = (score: number | undefined | null): ('success' | 'primary' | 'warning' | 'danger') => {
   if (score === null || score === undefined) return 'info'
   if (score >= 90) return 'success'
   if (score >= 80) return 'primary'
   if (score >= 70) return 'warning'
   return 'danger'
}

// --- ECharts Initializations ---

const initRadarChart = () => {
  if (radarChartRef.value) {
    radarChart?.dispose() // Dispose previous instance
    radarChart = echarts.init(radarChartRef.value)
    const indicatorData = [
      { name: '步频效率', max: 100 },
      { name: '步幅利用', max: 100 },
      { name: '姿态稳定', max: 100 },
      { name: '着地冲击', max: 100 }, // Lower is better
      { name: '能量消耗', max: 100 }, // Lower contact time is better
      { name: '综合评分', max: 100 }
    ]
    const radarValue = [
      // Normalize values more carefully, aiming for higher = better
      Math.min(100, Math.max(0, (analysisData.metrics.avgCadence / 180) * 100)), // Target 180
      Math.min(100, Math.max(0, (analysisData.metrics.avgStride / 120) * 100)), // Target 120
      Math.min(100, Math.max(0, analysisData.metrics.postureScore)),
      Math.min(100, Math.max(0, 100 - (analysisData.metrics.verticalOscillation / 10) * 100)), // Target < 10cm
      Math.min(100, Math.max(0, 100 - (analysisData.metrics.groundContactTime / 250) * 100)), // Target < 250ms
      Math.min(100, Math.max(0, analysisData.metrics.postureScore))
    ].map(v => parseFloat(v.toFixed(1))) // Keep one decimal place

    const option = {
      tooltip: {
          trigger: 'item',
          formatter: (params: any) => {
             let res = `${params.name}<br/>`
             indicatorData.forEach((indicator, index) => {
                res += `${params.marker}${indicator.name}: <strong>${radarValue[index]}</strong><br/>`
             })
             return res
          },
          backgroundColor: 'rgba(50, 50, 50, 0.7)',
          borderColor: '#333',
          textStyle: { color: '#fff' }
      },
      radar: {
        indicator: indicatorData,
        radius: '65%', // Adjust size
        center: ['50%', '55%'], // Adjust position
        axisName: { color: '#666', fontSize: 13 },
        splitArea: { areaStyle: { color: ['rgba(245, 247, 250, 0.5)', 'rgba(235, 238, 245, 0.5)'] } }, // Lighter split area
        axisLine: { lineStyle: { color: 'rgba(180, 180, 180, 0.6)' } },
        splitLine: { lineStyle: { color: 'rgba(180, 180, 180, 0.6)' } }
      },
      series: [
        {
          name: '训练表现雷达',
          type: 'radar',
          data: [
            {
              value: radarValue,
              name: '本次训练'
            }
          ],
           symbolSize: 6,
          itemStyle: { color: '#409EFF' },
          lineStyle: { color: '#409EFF', width: 2 },
          areaStyle: { color: 'rgba(64, 158, 255, 0.3)' }
        }
      ]
    }
    radarChart.setOption(option)
  }
}

const initGaitChart = () => {
  if (gaitChartRef.value) {
    gaitChart?.dispose()
    gaitChart = echarts.init(gaitChartRef.value)
    const supportPhaseValue = analysisData.gaitAnalysis.supportPhase || '0毫秒 (0%)'
    const flightPhaseValue = analysisData.gaitAnalysis.flightPhase || '0毫秒 (0%)'

    // Extract millisecond values
    const supportMs = parseFloat(supportPhaseValue.match(/^(\d+\.?\d*)/)?.[1] || '0')
    const flightMs = parseFloat(flightPhaseValue.match(/^(\d+\.?\d*)/)?.[1] || '0')
    const totalCycleTimeMs = (supportMs + flightMs).toFixed(0); // Calculate total time

    const supportPercent = parseFloat(supportPhaseValue.match(/(\d+\.?\d*)%/) ?.[1] || '0')
    const flightPercent = parseFloat(flightPhaseValue.match(/(\d+\.?\d*)%/) ?.[1] || '0')
    const option = {
      tooltip: {
          trigger: 'item',
          formatter: (params: any) => {
            // params.data.value should be the percentage
            const phaseTime = params.name === '支撑相' ? supportPhaseValue.split('(')[0].trim() : flightPhaseValue.split('(')[0].trim()
            return `${params.marker}${params.name}: <strong>${params.data.value}%</strong> (${phaseTime})`
          },
          backgroundColor: 'rgba(50, 50, 50, 0.7)',
          borderColor: '#333',
          textStyle: { color: '#fff' }
      },
       legend: {
          show: false // Hide default legend, info is in tooltip/description
       },
      series: [
        {
          name: '步态周期',
          type: 'pie',
          radius: ['50%', '75%'], // Slightly thicker doughnut
          center: ['50%', '50%'], // Center the pie chart
          avoidLabelOverlap: false,
          label: {
              show: true,
              position: 'center',
              // Update formatter to use calculated total time
              formatter: [
                  '{a|总周期}', // Title
                  `{b|${totalCycleTimeMs}}ms` // Display calculated total time
              ].join('\n'),
              rich: {
                  a: { fontSize: 14, color: '#999', lineHeight: 20 },
                  b: { fontSize: 18, color: '#333', fontWeight: 'bold' }
              }
          },
          emphasis: {
            label: { show: true } // Keep label visible on hover
          },
          labelLine: { show: false },
          data: [
            { value: supportPercent, name: '支撑相', itemStyle: { color: '#F56C6C' } },
            { value: flightPercent, name: '摆动相', itemStyle: { color: '#67C23A' } }
          ]
        }
      ]
    }
    gaitChart.setOption(option)
  }
}

const initPressureMap = () => {
  if (pressureMapRef.value) {
    pressureMap?.dispose()
    pressureMap = echarts.init(pressureMapRef.value)
    const forefoot = analysisData.pressureAnalysis.forefoot || 0
    const midfoot = analysisData.pressureAnalysis.midfoot || 0
    const rearfoot = analysisData.pressureAnalysis.rearfoot || 0
    const option = {
        tooltip: {
            trigger: 'item',
            formatter: (params: any) => { // params.name is series name
               return `${params.marker}${params.name}: <strong>${params.value}%</strong>`
            },
            backgroundColor: 'rgba(50, 50, 50, 0.7)',
            borderColor: '#333',
            textStyle: { color: '#fff' }
        },
         grid: { left: '5%', right: '5%', top: '20%', bottom: '10%' }, // Adjust grid
        xAxis: {
            type: 'value',
            max: 100,
            show: false // Hide axis
        },
        yAxis: {
            type: 'category',
            data: [''], // Single category for horizontal stack
            show: false // Hide axis
        },
        series: [
            {
                name: '前脚掌',
                type: 'bar',
                stack: 'total',
                label: {
                    show: forefoot > 10, // Show label only if segment is large enough
                    formatter: '{c}%',
                    position: 'inside',
                    color: '#fff',
                    fontSize: 11
                },
                emphasis: { focus: 'series' },
                data: [forefoot],
                itemStyle: { color: pressureColors.forefoot }
            },
            {
                name: '中脚掌',
                type: 'bar',
                stack: 'total',
                 label: {
                    show: midfoot > 10,
                    formatter: '{c}%',
                    position: 'inside',
                    color: '#fff',
                    fontSize: 11
                 },
                emphasis: { focus: 'series' },
                data: [midfoot],
                itemStyle: { color: pressureColors.midfoot }
            },
            {
                name: '后脚掌',
                type: 'bar',
                stack: 'total',
                 label: {
                    show: rearfoot > 10,
                    formatter: '{c}%',
                    position: 'inside',
                    color: '#fff',
                    fontSize: 11
                 },
                emphasis: { focus: 'series' },
                data: [rearfoot],
                itemStyle: { color: pressureColors.rearfoot }
            }
        ]
    }
    pressureMap.setOption(option)
  }
}

// Resize handler
const handleResize = () => {
  radarChart?.resize()
  gaitChart?.resize()
  pressureMap?.resize()
}

// Lifecycle hooks
onMounted(() => {
  // Load data for the first session option by default if needed
  // if (sessionOptions.value.length > 0) {
  //   selectedSession.value = sessionOptions.value[0].value
  //   loadSessionData(selectedSession.value)
  // }
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  radarChart?.dispose()
  gaitChart?.dispose()
  pressureMap?.dispose()
})
</script>

<style scoped>
.analysis-view {
  padding: 20px;
  background-color: var(--el-color-primary-light-9);
}

/* Page Header */
.page-header-card {
  margin-bottom: 24px;
  border: none;
  border-radius: 10px;
  box-shadow: var(--el-box-shadow-light);
}

:deep(.page-header-card .el-card__body) {
  padding: 15px 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
}

.session-selector {
  /* Styles for selector container if needed */
}

/* General Card Styling */
.analysis-section-card {
  margin-bottom: 24px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background-color: #fff;
}

:deep(.analysis-section-card .el-card__header) {
  background-color: #fff;
  border-bottom: 1px solid var(--el-border-color-lighter);
  padding: 12px 20px;
}

.card-header {
  display: flex;
  align-items: center; /* Align icon and text */
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.card-header .el-icon {
  margin-right: 8px; /* Space between icon and text */
  color: var(--el-color-primary);
  font-size: 1.2em;
}

:deep(.analysis-section-card .el-card__body) {
  padding: 20px; /* Consistent padding */
}

.chart-wrapper {
  height: 300px; /* Default chart height */
  width: 100%;
}

.analysis-content {
  /* Container for the main analysis sections */
}

/* Overview Section */
.overview-card .chart-wrapper {
  height: 320px; /* Slightly taller radar chart */
}

.radar-chart-col {
  display: flex;
  align-items: center;
  justify-content: center;
}

.overview-summary {
  /* Styles for summary text area */
}

.summary-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 10px 0;
  color: var(--el-text-color-primary);
}
.overview-summary .summary-title:nth-of-type(2) { /* Add margin top for second title */
    margin-top: 20px;
}

.summary-text {
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--el-text-color-regular);
  margin-bottom: 20px;
}

.overview-metrics .unit {
   font-size: 0.8em;
   color: var(--el-text-color-secondary);
   margin-left: 3px;
}
:deep(.overview-metrics .el-descriptions__label) {
    width: 100px; /* Adjust label width */
}

/* Detail Analysis Section */
.detail-analysis-row {
  /* Styles if needed */
}

.analysis-content-wrapper {
    display: flex;
    gap: 20px;
}

.gait-card .chart-wrapper,
.pressure-card .chart-wrapper {
    height: 250px;
    flex-shrink: 0;
    width: 200px; /* Adjust width for side charts */
}

.analysis-description {
   flex-grow: 1;
   min-width: 0;
}

.description-title {
    font-size: 1.05rem;
    font-weight: 600;
    margin: 0 0 8px 0;
    color: var(--el-text-color-primary);
}

.description-text {
    font-size: 0.9rem;
    line-height: 1.5;
    color: var(--el-text-color-regular);
    margin-bottom: 15px;
}

/* Gait Specific */
.phase-analysis {
    display: flex;
    justify-content: space-around; /* Space out items */
    align-items: center;
    background-color: #f9fafc;
    padding: 10px;
    border-radius: 6px;
    margin-top: 15px;
}
.phase-item {
    text-align: center;
}
.phase-title {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    font-size: 0.9rem;
    color: var(--el-text-color-secondary);
    margin-bottom: 5px;
}
.phase-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    display: inline-block;
}
.phase-dot.support { background-color: #F56C6C; }
.phase-dot.flight { background-color: #67C23A; }

.phase-value {
    font-size: 1rem;
    font-weight: 600;
    color: var(--el-text-color-primary);
}
.phase-analysis .el-divider--vertical {
    height: 2.5em;
    background-color: var(--el-border-color);
}

/* Pressure Specific */
.pressure-stats {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px; /* Space between progress bars */
}
.pressure-stats .el-progress {
    width: 100%;
}
:deep(.pressure-stats .el-progress__text) {
    min-width: 20px; /* Ensure text is visible */
    font-size: 11px !important;
    color: #fff !important; /* White text inside */
}
:deep(.pressure-stats .el-progress-bar__innerText) {
    display: flex;
    align-items: center;
    justify-content: center; /* Center custom text */
}


/* Recommendations Section */
.recommendation-card {
  /* Styles if needed */
}

.recommendations {
 /* Container styles */
}

:deep(.recommendation-item .el-collapse-item__header) {
    font-size: 1.05rem;
    font-weight: 500;
    background-color: #fcfdff;
    border-radius: 4px;
    border: 1px solid var(--el-border-color-lighter);
    margin-bottom: 5px; /* Space between items */
    padding-left: 15px;
}
:deep(.recommendation-item .el-collapse-item__header.is-active) {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    border-bottom: none;
}


:deep(.recommendation-item .el-collapse-item__wrap) {
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
    border: 1px solid var(--el-border-color-lighter);
    border-top: none;
}
:deep(.recommendation-item .el-collapse-item__content) {
    padding: 15px 20px;
}

.recommendation-title {
  display: flex;
  align-items: center;
}
.recommendation-title .el-icon {
  margin-right: 8px;
  color: var(--el-color-primary);
}

.recommendation-content {
 /* Styles for content area */
}

.recommendation-description {
  font-size: 0.95rem;
  color: var(--el-text-color-regular);
  line-height: 1.6;
  margin-bottom: 15px;
}

.exercises-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 15px 0 10px 0;
  color: var(--el-text-color-primary);
}

.exercises-list {
  list-style: none;
  padding-left: 5px;
  margin: 0;
}

.exercises-list li {
  font-size: 0.9rem;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
}
.exercises-list li .el-icon {
    margin-right: 6px;
    color: #67C23A; /* Green check */
}

/* Placeholder and Loading */
.placeholder-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 50vh; /* Ensure it takes up space */
    padding: 40px;
}

.loading-animation {
    width: 80px;
    height: 80px;
    border: 5px solid var(--el-color-primary-light-5);
    border-top-color: var(--el-color-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 992px) {
    .analysis-content-wrapper {
        flex-direction: column;
    }
    .gait-card .chart-wrapper,
    .pressure-card .chart-wrapper {
        width: 100%; /* Full width on smaller screens */
        height: 200px; /* Adjust height */
    }
}

@media (max-width: 768px) {
  .analysis-view {
      padding: 15px;
  }
  .page-header-card, .analysis-section-card {
      margin-bottom: 15px;
  }
  .header-content {
    flex-direction: column;
    align-items: flex-start;
  }
  .session-selector .el-select {
    width: 100% !important; /* Full width selector */
  }
   .overview-summary .summary-title {
       margin-top: 15px;
   }
    :deep(.overview-metrics .el-descriptions__label) {
      width: auto; /* Auto width for labels on mobile */
   }
   .analysis-content-wrapper {
       gap: 15px;
   }
   :deep(.recommendation-item .el-collapse-item__header) {
       font-size: 1rem;
       padding-left: 10px;
   }
    :deep(.recommendation-item .el-collapse-item__content) {
      padding: 10px 15px;
   }
   .recommendation-description, .exercises-list li {
       font-size: 0.9rem;
   }
   .exercises-title {
       font-size: 0.95rem;
   }
}

</style>

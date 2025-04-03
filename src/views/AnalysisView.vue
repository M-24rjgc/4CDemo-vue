<template>
  <div class="analysis-container">
    <div class="analysis-header">
      <h1>深度分析</h1>
      <el-select v-model="selectedSession" placeholder="选择训练记录" @change="loadSessionData">
        <el-option
          v-for="item in sessionOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
    </div>

    <el-row :gutter="20" v-loading="loading">
      <el-col :span="24">
        <el-card class="overview-card">
          <template #header>
            <div class="card-header">
              <span>综合评估</span>
            </div>
          </template>
          <el-row :gutter="20">
            <el-col :span="8">
              <div class="overview-chart" ref="radarChartRef"></div>
            </el-col>
            <el-col :span="16">
              <div class="overview-summary">
                <h3>训练总结</h3>
                <p>{{ analysisData.summary }}</p>
                
                <h3>核心指标</h3>
                <el-descriptions :column="3" border>
                  <el-descriptions-item label="平均步频">
                    {{ analysisData.metrics?.avgCadence || '--' }} 步/分钟
                  </el-descriptions-item>
                  <el-descriptions-item label="平均步幅">
                    {{ analysisData.metrics?.avgStride || '--' }} 厘米
                  </el-descriptions-item>
                  <el-descriptions-item label="姿态评分">
                    {{ analysisData.metrics?.postureScore || '--' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="着地方式">
                    {{ analysisData.metrics?.landingPattern || '--' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="垂直振幅">
                    {{ analysisData.metrics?.verticalOscillation || '--' }} 厘米
                  </el-descriptions-item>
                  <el-descriptions-item label="触地时间">
                    {{ analysisData.metrics?.groundContactTime || '--' }} 毫秒
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </el-col>
          </el-row>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="detail-section">
      <el-col :span="12">
        <el-card class="analysis-card">
          <template #header>
            <div class="card-header">
              <span>步态分析</span>
            </div>
          </template>
          <div class="gait-analysis">
            <div class="gait-chart" ref="gaitChartRef"></div>
            <div class="gait-description">
              <h3>步态周期分析</h3>
              <p>{{ analysisData.gaitAnalysis?.description }}</p>
              
              <div class="phase-analysis">
                <div class="phase-item">
                  <div class="phase-title">
                    <span class="phase-dot support"></span>
                    <span>支撑相</span>
                  </div>
                  <div class="phase-value">{{ analysisData.gaitAnalysis?.supportPhase || '--' }}</div>
                </div>
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
      <el-col :span="12">
        <el-card class="analysis-card">
          <template #header>
            <div class="card-header">
              <span>足压分析</span>
            </div>
          </template>
          <div class="pressure-analysis">
            <div class="pressure-map" ref="pressureMapRef"></div>
            <div class="pressure-description">
              <h3>足压分布特征</h3>
              <p>{{ analysisData.pressureAnalysis?.description }}</p>
              
              <div class="pressure-stats">
                <el-progress 
                  :percentage="analysisData.pressureAnalysis?.forefoot || 0" 
                  :format="() => '前脚掌'"
                  :stroke-width="15"
                  color="#F56C6C"
                />
                <el-progress 
                  :percentage="analysisData.pressureAnalysis?.midfoot || 0" 
                  :format="() => '中脚掌'"
                  :stroke-width="15"
                  color="#409EFF"
                />
                <el-progress 
                  :percentage="analysisData.pressureAnalysis?.rearfoot || 0" 
                  :format="() => '后脚掌'"
                  :stroke-width="15"
                  color="#67C23A"
                />
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="recommendation-section">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>改进建议</span>
            </div>
          </template>
          <div class="recommendations">
            <el-empty v-if="!analysisData.recommendations?.length" description="暂无建议" />
            <el-collapse v-else accordion>
              <el-collapse-item
                v-for="(item, index) in analysisData.recommendations"
                :key="index"
                :title="item.title"
                :name="index"
              >
                <div class="recommendation-content">
                  <p>{{ item.description }}</p>
                  <div class="recommendation-exercises" v-if="item.exercises?.length">
                    <h4>推荐练习:</h4>
                    <ul>
                      <li v-for="(exercise, i) in item.exercises" :key="i">
                        {{ exercise }}
                      </li>
                    </ul>
                  </div>
                </div>
              </el-collapse-item>
            </el-collapse>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'

// 加载状态
const loading = ref(false)

// 训练记录选项
const sessionOptions = ref([
  { value: '1', label: '2023-03-28 晨跑 (40分钟)' },
  { value: '2', label: '2023-03-25 间歇跑 (35分钟)' },
  { value: '3', label: '2023-03-20 长跑 (60分钟)' },
  { value: '4', label: '2023-03-15 恢复跑 (30分钟)' }
])

// 当前选中的训练记录
const selectedSession = ref('')

// 图表引用
const radarChartRef = ref<HTMLElement>()
const gaitChartRef = ref<HTMLElement>()
const pressureMapRef = ref<HTMLElement>()

// 图表实例
let radarChart: echarts.ECharts | null = null
let gaitChart: echarts.ECharts | null = null
let pressureMap: echarts.ECharts | null = null

// 分析数据
const analysisData = reactive({
  summary: '本次训练整体表现良好，步频保持稳定，姿态评分为85分。着地方式为中足着地，垂直振幅控制在适当范围内。建议关注足部外翻过度的问题，可通过特定练习改善。',
  metrics: {
    avgCadence: 172,
    avgStride: 115,
    postureScore: 85,
    landingPattern: '中足着地',
    verticalOscillation: 8.5,
    groundContactTime: 220
  },
  gaitAnalysis: {
    description: '步态周期分析显示支撑相与摆动相比例适中，步态节奏均匀稳定。支撑相时间在理想范围内，摆动相展现出良好的弹性。',
    supportPhase: '220毫秒 (38%)',
    flightPhase: '360毫秒 (62%)'
  },
  pressureAnalysis: {
    description: '足压分布以中前脚掌为主，外侧压力略大。前脚掌受力占比45%，中脚掌占比30%，后脚掌占比25%，符合中足着地模式。',
    forefoot: 45,
    midfoot: 30,
    rearfoot: 25
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
    {
      title: '优化步频',
      description: '您的平均步频为172步/分钟，略低于最佳范围(175-185步/分钟)。提高步频可减少冲击力并改善跑步经济性。',
      exercises: [
        '节拍器训练 (设置180BPM，跟随节奏跑步)',
        '高抬腿练习 (30秒，4组)',
        '短距离加速跑 (100米，专注于步频)'
      ]
    },
    {
      title: '核心肌群强化',
      description: '分析显示在长时间跑步后，您的躯干稳定性略有下降，这会影响整体姿态和能量消耗。建议强化核心肌群以提高稳定性。',
      exercises: [
        '平板支撑 (60秒，3组)',
        '侧平板支撑 (每侧40秒，3组)',
        '死虫动作 (15次，3组)'
      ]
    }
  ]
})

// 初始化图表
const initCharts = () => {
  // 雷达图
  if (radarChartRef.value) {
    radarChart = echarts.init(radarChartRef.value)
    const radarOption = {
      radar: {
        indicator: [
          { name: '步频', max: 100 },
          { name: '步幅', max: 100 },
          { name: '姿态', max: 100 },
          { name: '触地时间', max: 100 },
          { name: '垂直振幅', max: 100 },
          { name: '足压均衡', max: 100 }
        ],
        radius: '65%',
        splitNumber: 4,
        axisName: {
          color: '#333'
        }
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: [85, 80, 85, 75, 70, 65],
              name: '当前表现',
              areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: 'rgba(64, 158, 255, 0.7)' },
                  { offset: 1, color: 'rgba(64, 158, 255, 0.3)' }
                ])
              },
              lineStyle: {
                width: 3
              }
            },
            {
              value: [90, 85, 90, 85, 80, 85],
              name: '理想表现',
              lineStyle: {
                width: 2,
                type: 'dashed'
              }
            }
          ]
        }
      ],
      tooltip: {
        trigger: 'item'
      },
      legend: {
        data: ['当前表现', '理想表现'],
        bottom: 0
      }
    }
    radarChart.setOption(radarOption)
  }
  
  // 步态周期图
  if (gaitChartRef.value) {
    gaitChart = echarts.init(gaitChartRef.value)
    const gaitOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {
        data: ['支撑相', '摆动相']
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: ['理想值', '您的数据', '普通跑者']
      },
      yAxis: {
        type: 'value',
        max: 100
      },
      series: [
        {
          name: '支撑相',
          type: 'bar',
          stack: 'total',
          emphasis: {
            focus: 'series'
          },
          data: [35, 38, 45],
          color: '#F56C6C'
        },
        {
          name: '摆动相',
          type: 'bar',
          stack: 'total',
          emphasis: {
            focus: 'series'
          },
          data: [65, 62, 55],
          color: '#67C23A'
        }
      ]
    }
    gaitChart.setOption(gaitOption)
  }
  
  // 足压热力图
  if (pressureMapRef.value) {
    pressureMap = echarts.init(pressureMapRef.value)
    const pressureOption = {
      tooltip: {
        position: 'top'
      },
      grid: {
        height: '50%',
        top: '10%'
      },
      xAxis: {
        type: 'category',
        data: ['外侧', '中间', '内侧'],
        splitArea: {
          show: true
        }
      },
      yAxis: {
        type: 'category',
        data: ['前脚掌', '中脚掌', '后脚掌'],
        splitArea: {
          show: true
        }
      },
      visualMap: {
        min: 0,
        max: 10,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '0%',
        inRange: {
          color: ['#e0f5ff', '#7ecef4', '#1890ff', '#0050b3']
        }
      },
      series: [
        {
          name: '足压分布',
          type: 'heatmap',
          data: [
            [0, 0, 8], [1, 0, 6], [2, 0, 4],
            [0, 1, 5], [1, 1, 7], [2, 1, 3],
            [0, 2, 3], [1, 2, 4], [2, 2, 2]
          ],
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    }
    pressureMap.setOption(pressureOption)
  }
}

// 加载会话数据
const loadSessionData = () => {
  if (!selectedSession.value) return
  
  loading.value = true
  
  // 模拟数据加载
  setTimeout(() => {
    // 真实应用中这里会根据selectedSession的值从API获取数据
    loading.value = false
    
    // 重新初始化图表
    initCharts()
  }, 800)
}

// 窗口大小改变时重新调整图表大小
const handleResize = () => {
  radarChart?.resize()
  gaitChart?.resize()
  pressureMap?.resize()
}

// 组件挂载
onMounted(() => {
  selectedSession.value = sessionOptions.value[0].value
  initCharts()
  loadSessionData()
  window.addEventListener('resize', handleResize)
})

// 组件卸载
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  radarChart?.dispose()
  gaitChart?.dispose()
  pressureMap?.dispose()
})
</script>

<style scoped>
.analysis-container {
  padding: 20px;
}

.analysis-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.analysis-header h1 {
  margin: 0;
  color: var(--el-color-primary);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.overview-card {
  margin-bottom: 20px;
}

.overview-chart {
  height: 300px;
}

.overview-summary {
  padding: 0 20px;
}

.overview-summary h3 {
  color: var(--el-color-primary);
  margin-top: 0;
}

.detail-section {
  margin-bottom: 20px;
}

.analysis-card {
  height: 100%;
}

.gait-analysis, .pressure-analysis {
  display: flex;
  flex-direction: column;
}

.gait-chart, .pressure-map {
  height: 250px;
  margin-bottom: 20px;
}

.gait-description, .pressure-description {
  padding: 0 10px;
}

.gait-description h3, .pressure-description h3 {
  color: var(--el-color-primary);
  margin-top: 0;
}

.phase-analysis {
  display: flex;
  justify-content: space-around;
  margin-top: 20px;
}

.phase-item {
  text-align: center;
}

.phase-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  margin-bottom: 5px;
}

.phase-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.phase-dot.support {
  background-color: #F56C6C;
}

.phase-dot.flight {
  background-color: #67C23A;
}

.phase-value {
  font-weight: bold;
}

.pressure-stats {
  margin-top: 20px;
}

.recommendation-section {
  margin-bottom: 20px;
}

.recommendation-content {
  padding: 0 20px;
}

.recommendation-exercises h4 {
  margin-bottom: 10px;
  color: var(--el-color-primary);
}

.recommendation-exercises ul {
  padding-left: 20px;
}

.recommendation-exercises li {
  margin-bottom: 5px;
}
</style> 
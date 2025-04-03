<template>
  <div class="history-container">
    <div class="history-header">
      <h1>历史数据</h1>
      <div class="filter-section">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          :shortcuts="dateShortcuts"
        />
        <el-button type="primary" @click="loadHistoryData">
          <el-icon><Search /></el-icon> 查询
        </el-button>
      </div>
    </div>

    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6" v-for="(stat, index) in statisticsData" :key="index">
        <el-card class="stat-card">
          <div class="stat-icon">
            <el-icon :size="40"><component :is="stat.icon" /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="trend-section">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>跑步表现趋势</span>
              <el-radio-group v-model="trendType" size="small">
                <el-radio-button label="cadence">步频</el-radio-button>
                <el-radio-button label="stride">步幅</el-radio-button>
                <el-radio-button label="score">姿态评分</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div class="trend-chart" ref="trendChartRef"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="history-list-section">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>训练记录</span>
            </div>
          </template>
          <el-table :data="historyRecords" style="width: 100%" v-loading="loading">
            <el-table-column prop="date" label="日期" width="180" />
            <el-table-column prop="duration" label="时长" width="120" />
            <el-table-column prop="avgCadence" label="平均步频" width="120" />
            <el-table-column prop="avgStride" label="平均步幅" width="120" />
            <el-table-column prop="avgScore" label="平均评分" width="120">
              <template #default="scope">
                <el-progress
                  :percentage="scope.row.avgScore"
                  :color="getScoreColor(scope.row.avgScore)"
                />
              </template>
            </el-table-column>
            <el-table-column prop="feedback" label="主要反馈" />
            <el-table-column label="操作" width="120">
              <template #default="scope">
                <el-button type="primary" link @click="viewDetail(scope.row)">
                  详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="pagination">
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :page-sizes="[5, 10, 20, 50]"
              layout="total, sizes, prev, pager, next, jumper"
              :total="totalRecords"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="训练详情"
      width="70%"
      class="detail-dialog"
    >
      <template v-if="selectedRecord">
        <div class="detail-header">
          <div class="detail-info">
            <h2>{{ selectedRecord.date }}</h2>
            <div class="detail-meta">
              <span><el-icon><Timer /></el-icon> 时长：{{ selectedRecord.duration }}</span>
              <span><el-icon><Odometer /></el-icon> 平均步频：{{ selectedRecord.avgCadence }}步/分钟</span>
              <span><el-icon><ScaleToOriginal /></el-icon> 平均步幅：{{ selectedRecord.avgStride }}厘米</span>
            </div>
          </div>
          <div class="detail-score">
            <el-progress
              type="dashboard"
              :percentage="selectedRecord.avgScore"
              :color="getScoreColor(selectedRecord.avgScore)"
            />
            <div class="score-label">综合评分</div>
          </div>
        </div>

        <el-divider />

        <el-tabs>
          <el-tab-pane label="详细数据">
            <div class="detail-chart" ref="detailChartRef"></div>
          </el-tab-pane>
          <el-tab-pane label="反馈与建议">
            <div class="feedback-section">
              <el-timeline>
                <el-timeline-item
                  v-for="(item, index) in detailFeedbacks"
                  :key="index"
                  :type="item.type"
                  :color="getFeedbackColor(item.type)"
                  :timestamp="item.timestamp"
                >
                  {{ item.content }}
                </el-timeline-item>
              </el-timeline>
            </div>
          </el-tab-pane>
        </el-tabs>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { Search, Timer, Odometer, ScaleToOriginal } from '@element-plus/icons-vue'

// 加载状态
const loading = ref(false)

// 日期范围
const dateRange = ref([
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  new Date()
])

// 日期快捷选项
const dateShortcuts = [
  {
    text: '最近一周',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 7)
      return [start, end]
    }
  },
  {
    text: '最近一个月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 30)
      return [start, end]
    }
  },
  {
    text: '最近三个月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 90)
      return [start, end]
    }
  }
]

// 统计数据
const statisticsData = ref([
  {
    label: '总训练次数',
    value: '24',
    icon: 'Aim'
  },
  {
    label: '总训练时长',
    value: '32小时',
    icon: 'Timer'
  },
  {
    label: '平均姿态评分',
    value: '78.5',
    icon: 'DataAnalysis'
  },
  {
    label: '最高姿态评分',
    value: '92',
    icon: 'TopRight'
  }
])

// 趋势图表类型
const trendType = ref('score')

// 趋势图表引用
const trendChartRef = ref<HTMLElement>()
let trendChart: echarts.ECharts | null = null

// 详情图表引用
const detailChartRef = ref<HTMLElement>()
let detailChart: echarts.ECharts | null = null

// 分页数据
const currentPage = ref(1)
const pageSize = ref(10)
const totalRecords = ref(24)

// 历史记录数据
const historyRecords = ref([
  {
    id: 1,
    date: '2023-03-15',
    duration: '45分钟',
    avgCadence: 172,
    avgStride: 115,
    avgScore: 85,
    feedback: '步频稳定，姿态良好'
  },
  {
    id: 2,
    date: '2023-03-12',
    duration: '30分钟',
    avgCadence: 168,
    avgStride: 110,
    avgScore: 78,
    feedback: '足外翻角度过大，建议调整'
  },
  {
    id: 3,
    date: '2023-03-08',
    duration: '50分钟',
    avgCadence: 175,
    avgStride: 118,
    avgScore: 82,
    feedback: '前后足压比例良好'
  },
  {
    id: 4,
    date: '2023-03-05',
    duration: '40分钟',
    avgCadence: 170,
    avgStride: 112,
    avgScore: 75,
    feedback: '支撑相时间偏长'
  },
  {
    id: 5,
    date: '2023-02-28',
    duration: '60分钟',
    avgCadence: 173,
    avgStride: 116,
    avgScore: 80,
    feedback: '整体表现良好'
  }
])

// 详情对话框
const detailDialogVisible = ref(false)
const selectedRecord = ref(null)

// 详情反馈数据
const detailFeedbacks = ref([
  {
    type: 'success',
    content: '步频保持在170-180步/分钟，符合理想范围',
    timestamp: '开始后10分钟'
  },
  {
    type: 'warning',
    content: '检测到足部外翻角度略大，建议调整足部着地方式',
    timestamp: '开始后15分钟'
  },
  {
    type: 'info',
    content: '身体垂直稳定性良好，能量消耗效率高',
    timestamp: '开始后25分钟'
  },
  {
    type: 'success',
    content: '手臂摆动幅度和节奏与步频匹配良好',
    timestamp: '开始后30分钟'
  },
  {
    type: 'danger',
    content: '检测到明显的疲劳模式，步态不稳定性增加',
    timestamp: '开始后40分钟'
  }
])

// 获取评分颜色
const getScoreColor = (score: number) => {
  if (score < 60) return '#F56C6C'
  if (score < 80) return '#E6A23C'
  return '#67C23A'
}

// 获取反馈类型颜色
const getFeedbackColor = (type: string) => {
  const colors = {
    'success': '#67C23A',
    'warning': '#E6A23C',
    'danger': '#F56C6C',
    'info': '#909399'
  }
  return colors[type as keyof typeof colors] || '#409EFF'
}

// 加载历史数据
const loadHistoryData = () => {
  loading.value = true
  // 模拟数据加载
  setTimeout(() => {
    loading.value = false
    
    // 更新趋势图表
    updateTrendChart()
  }, 800)
}

// 查看详情
const viewDetail = (record: any) => {
  selectedRecord.value = record
  detailDialogVisible.value = true
  
  // 延迟初始化详情图表，确保DOM已经渲染
  setTimeout(() => {
    initDetailChart()
  }, 100)
}

// 分页大小变化
const handleSizeChange = (val: number) => {
  pageSize.value = val
  loadHistoryData()
}

// 当前页变化
const handleCurrentChange = (val: number) => {
  currentPage.value = val
  loadHistoryData()
}

// 初始化趋势图表
const initTrendChart = () => {
  if (trendChartRef.value) {
    trendChart = echarts.init(trendChartRef.value)
    updateTrendChart()
  }
}

// 更新趋势图表
const updateTrendChart = () => {
  if (!trendChart) return
  
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['数值', '趋势线']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['3/1', '3/5', '3/8', '3/12', '3/15', '3/20', '3/25', '3/28']
    },
    yAxis: {
      type: 'value',
      min: trendType.value === 'score' ? 50 : (trendType.value === 'cadence' ? 150 : 90)
    },
    series: [
      {
        name: '数值',
        type: 'scatter',
        data: trendType.value === 'score' 
          ? [75, 78, 82, 78, 85, 83, 88, 86]
          : (trendType.value === 'cadence' 
              ? [168, 170, 175, 168, 172, 174, 176, 173]
              : [110, 112, 118, 110, 115, 116, 120, 118]),
        symbolSize: 10
      },
      {
        name: '趋势线',
        type: 'line',
        smooth: true,
        data: trendType.value === 'score' 
          ? [75, 78, 82, 78, 85, 83, 88, 86]
          : (trendType.value === 'cadence' 
              ? [168, 170, 175, 168, 172, 174, 176, 173]
              : [110, 112, 118, 110, 115, 116, 120, 118]),
        lineStyle: {
          color: '#409EFF',
          width: 3
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64, 158, 255, 0.4)' },
            { offset: 1, color: 'rgba(64, 158, 255, 0.1)' }
          ])
        }
      }
    ]
  }
  
  trendChart.setOption(option)
}

// 初始化详情图表
const initDetailChart = () => {
  if (detailChartRef.value) {
    if (detailChart) {
      detailChart.dispose()
    }
    
    detailChart = echarts.init(detailChartRef.value)
    
    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        }
      },
      legend: {
        data: ['步频', '步幅', '姿态评分', '垂直振幅']
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: ['0分钟', '5分钟', '10分钟', '15分钟', '20分钟', '25分钟', 
               '30分钟', '35分钟', '40分钟', '45分钟']
      },
      yAxis: [
        {
          type: 'value',
          name: '步频(步/分钟)',
          position: 'left',
          min: 150,
          max: 190
        },
        {
          type: 'value',
          name: '评分',
          position: 'right',
          min: 50,
          max: 100
        }
      ],
      series: [
        {
          name: '步频',
          type: 'line',
          data: [175, 173, 177, 172, 170, 174, 176, 175, 172, 168],
          smooth: true,
          lineStyle: {
            color: '#409EFF',
            width: 3
          }
        },
        {
          name: '步幅',
          type: 'line',
          data: [112, 113, 115, 114, 116, 117, 116, 114, 112, 110],
          smooth: true,
          lineStyle: {
            color: '#67C23A',
            width: 3
          }
        },
        {
          name: '姿态评分',
          type: 'line',
          yAxisIndex: 1,
          data: [82, 84, 87, 85, 86, 88, 85, 83, 80, 75],
          smooth: true,
          lineStyle: {
            color: '#E6A23C',
            width: 3
          }
        },
        {
          name: '垂直振幅',
          type: 'line',
          data: [8.5, 8.3, 8.2, 8.4, 8.5, 8.6, 8.7, 8.9, 9.1, 9.3],
          smooth: true,
          lineStyle: {
            color: '#F56C6C',
            width: 3
          }
        }
      ]
    }
    
    detailChart.setOption(option)
  }
}

// 窗口大小改变时重新调整图表大小
const handleResize = () => {
  trendChart?.resize()
  detailChart?.resize()
}

// 组件挂载
onMounted(() => {
  loadHistoryData()
  initTrendChart()
  window.addEventListener('resize', handleResize)
})

// 组件卸载
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
  detailChart?.dispose()
})
</script>

<style scoped>
.history-container {
  padding: 20px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.history-header h1 {
  margin: 0;
  color: var(--el-color-primary);
}

.filter-section {
  display: flex;
  gap: 10px;
}

.stat-cards {
  margin-bottom: 20px;
}

.stat-card {
  height: 120px;
  display: flex;
  align-items: center;
  padding: 20px;
}

.stat-icon {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 80px;
  height: 80px;
  background-color: var(--el-color-primary-light-9);
  border-radius: 50%;
  margin-right: 20px;
  color: var(--el-color-primary);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: bold;
  color: var(--el-color-primary);
  line-height: 1;
  margin-bottom: 5px;
}

.stat-label {
  color: var(--el-text-color-secondary);
}

.trend-section {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.trend-chart {
  height: 350px;
}

.history-list-section {
  margin-bottom: 20px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.detail-dialog :deep(.el-dialog__body) {
  padding: 0 20px 20px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
}

.detail-info h2 {
  margin-top: 0;
  margin-bottom: 10px;
  color: var(--el-color-primary);
}

.detail-meta {
  display: flex;
  gap: 20px;
  color: var(--el-text-color-secondary);
}

.detail-meta span {
  display: flex;
  align-items: center;
  gap: 5px;
}

.detail-score {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.score-label {
  margin-top: 10px;
  color: var(--el-text-color-secondary);
}

.detail-chart {
  height: 400px;
  margin: 20px 0;
}

.feedback-section {
  padding: 20px 0;
}
</style> 
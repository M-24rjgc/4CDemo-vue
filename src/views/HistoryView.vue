<template>
  <div class="history-view">
    <!-- Header & Filters -->
    <el-card class="page-header-card" shadow="never">
      <div class="header-content">
        <h1 class="page-title">历史数据</h1>
        <div class="filter-controls">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            :shortcuts="dateShortcuts"
            clearable
            class="date-picker"
          />
          <el-button type="primary" @click="loadHistoryData" :loading="loading" :icon="Search">
            查询
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- Statistics Cards -->
    <el-row :gutter="24" class="stat-cards-row">
      <el-col :xs="12" :sm="12" :md="6" v-for="(stat, index) in statisticsData" :key="index">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-card-content">
             <div class="stat-icon-wrapper" :style="{ backgroundColor: stat.bgColor }">
              <el-icon :size="30" :color="stat.color"><component :is="stat.iconComponent" /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Trend Chart -->
    <el-card class="trend-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>跑步表现趋势</span>
          <el-radio-group v-model="trendType" size="small" @change="updateTrendChart">
            <el-radio-button label="cadence">平均步频</el-radio-button>
            <el-radio-button label="stride">平均步幅</el-radio-button>
            <el-radio-button label="score">平均评分</el-radio-button>
          </el-radio-group>
        </div>
      </template>
      <div class="chart-container" ref="trendChartRef" v-loading="chartLoading"></div>
    </el-card>

    <!-- History List Table -->
    <el-card class="history-table-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>训练记录</span>
          <!-- Can add export button or other controls here -->
        </div>
      </template>
      <el-table
        :data="historyRecords"
        style="width: 100%"
        v-loading="loading"
        stripe
        :header-cell-style="{ background:'#f5f7fa', color:'#606266' }"
        @row-click="viewDetail"
        class="history-table"
      >
        <el-table-column prop="date" label="日期" sortable width="150" />
        <el-table-column prop="duration" label="时长" width="100" />
        <el-table-column prop="avgCadence" label="平均步频" width="120">
           <template #default="scope">{{ scope.row.avgCadence }} <span class="unit">步/分</span></template>
        </el-table-column>
        <el-table-column prop="avgStride" label="平均步幅" width="120">
           <template #default="scope">{{ scope.row.avgStride }} <span class="unit">厘米</span></template>
        </el-table-column>
        <el-table-column prop="avgScore" label="平均评分" width="150">
          <template #default="scope">
            <div class="score-cell">
              <el-progress
                :percentage="scope.row.avgScore"
                :color="getScoreColor(scope.row.avgScore)"
                :stroke-width="8"
                :show-text="false"
                style="width: 80px; margin-right: 8px;"
              />
              <span>{{ scope.row.avgScore }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="feedback" label="主要反馈" min-width="200" show-overflow-tooltip />
        <el-table-column label="操作" width="100" align="center">
          <template #default="{ row }">
            <el-button type="primary" link :icon="View" @click.stop="viewDetail(row)">
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="totalRecords"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          background
        />
      </div>
    </el-card>

    <!-- Detail Dialog -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="selectedRecord ? `${selectedRecord.date} 训练详情` : '训练详情'"
      width="75%"
      top="5vh"
      class="detail-dialog"
      destroy-on-close
    >
      <template v-if="selectedRecord">
        <el-container class="detail-layout">
          <el-header class="detail-dialog-header" height="auto">
             <el-row :gutter="20" align="middle">
               <el-col :span="18">
                 <div class="detail-meta">
                   <span title="时长"><el-icon><Timer /></el-icon> {{ selectedRecord.duration }}</span>
                   <el-divider direction="vertical" />
                   <span title="平均步频"><el-icon><Odometer /></el-icon> {{ selectedRecord.avgCadence }} <span class="unit">步/分</span></span>
                   <el-divider direction="vertical" />
                   <span title="平均步幅"><el-icon><ScaleToOriginal /></el-icon> {{ selectedRecord.avgStride }} <span class="unit">厘米</span></span>
                 </div>
               </el-col>
               <el-col :span="6">
                 <div class="detail-score">
                    <el-progress
                      type="dashboard"
                      :percentage="selectedRecord.avgScore"
                      :color="getScoreColor(selectedRecord.avgScore)"
                      :width="100"
                    />
                    <div class="score-label">综合评分</div>
                  </div>
               </el-col>
             </el-row>
          </el-header>
          <el-main class="detail-dialog-main">
            <el-tabs v-model="activeDetailTab" class="detail-tabs">
              <el-tab-pane label="详细数据图表" name="chart">
                <div class="detail-chart-container" ref="detailChartRef" v-loading="detailChartLoading"></div>
              </el-tab-pane>
              <el-tab-pane label="关键指标分析" name="metrics">
                 <div class="key-metrics-analysis">
                    <!-- Placeholder for more detailed metric analysis -->
                    <el-descriptions :column="2" border>
                      <el-descriptions-item label="垂直振幅">8.2 cm</el-descriptions-item>
                      <el-descriptions-item label="触地时间">215 ms</el-descriptions-item>
                      <el-descriptions-item label="腾空时间">350 ms</el-descriptions-item>
                      <el-descriptions-item label="着地方式">中足着地 (68%)</el-descriptions-item>
                    </el-descriptions>
                 </div>
              </el-tab-pane>
              <el-tab-pane label="反馈与建议" name="feedback">
                <div class="feedback-section">
                  <h4 class="feedback-title">系统反馈摘要</h4>
                  <p class="feedback-summary">{{ selectedRecord.feedback }}</p>
                  <h4 class="feedback-title">改进建议时间线</h4>
                  <el-timeline class="feedback-timeline">
                    <el-timeline-item
                      v-for="(item, index) in detailFeedbacks"
                      :key="index"
                      :type="item.type"
                      :color="getFeedbackColor(item.type)"
                      :timestamp="item.timestamp"
                      placement="top"
                    >
                      <el-card shadow="hover" class="timeline-card">
                        <p>{{ item.content }}</p>
                      </el-card>
                    </el-timeline-item>
                  </el-timeline>
                </div>
              </el-tab-pane>
            </el-tabs>
          </el-main>
        </el-container>
      </template>
       <template #footer>
         <el-button @click="detailDialogVisible = false">关闭</el-button>
         <!-- <el-button type="primary">导出报告</el-button> -->
       </template>
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed, nextTick, watch } from 'vue' // Added watch
import * as echarts from 'echarts'
// Import necessary icons
import { Search, Timer, Odometer, ScaleToOriginal, Aim, DataAnalysis, Trophy, Calendar, View } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'; // Import useRouter

const router = useRouter(); // Initialize router

// Loading states
const loading = ref(false)
const chartLoading = ref(false)
const detailChartLoading = ref(false)

// Date range
const dateRange = ref<[Date, Date] | null>([
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  new Date()
])

// Date shortcuts
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

// Statistics Data (Updated with icons and colors)
const statisticsData = ref([
  {
    label: '总训练次数',
    value: '24',
    iconComponent: Calendar, // Changed icon
    color: '#409EFF',
    bgColor: '#ecf5ff'
  },
  {
    label: '总训练时长',
    value: '32小时',
    iconComponent: Timer,
    color: '#67C23A',
    bgColor: '#f0f9eb'
  },
  {
    label: '平均姿态评分',
    value: '78.5',
    iconComponent: DataAnalysis,
    color: '#E6A23C',
    bgColor: '#fdf6ec'
  },
  {
    label: '最高姿态评分',
    value: '92',
    iconComponent: Trophy, // Changed icon
    color: '#F56C6C',
    bgColor: '#fef0f0'
  }
])

// Trend Chart
const trendType = ref('score')
const trendChartRef = ref<HTMLElement | null>(null)
let trendChart: echarts.ECharts | null = null

// Detail Dialog
const detailDialogVisible = ref(false)
const selectedRecord = ref<any>(null) // Type for record
const activeDetailTab = ref('chart') // Default tab
const detailChartRef = ref<HTMLElement | null>(null)
let detailChart: echarts.ECharts | null = null
const detailFeedbacks = ref([
  { timestamp: '00:05:12', content: '步频略低，尝试加快节奏', type: 'warning' },
  { timestamp: '00:15:30', content: '姿态稳定，保持当前状态', type: 'success' },
  { timestamp: '00:25:05', content: '检测到足部外翻，注意调整落地', type: 'danger' },
  { timestamp: '00:35:48', content: '心率进入目标区间，保持配速', type: 'primary' },
]);

// Pagination
const currentPage = ref(1)
const pageSize = ref(10)
const totalRecords = ref(0) // Initialize with 0, update after fetch

// History Records (Example structure, fetch real data)
const historyRecords = ref<any[]>([]) // Initialize as empty array
const allHistoryData = ref<any[]>([]); // Store all data for filtering/charting

// Mock API fetch function - Simulates fetching ALL data and then filtering/paginating client-side
const mockFetchAllHistory = (dateRangeValue: [Date, Date] | null) => {
  return new Promise<any[]>((resolve) => {
    // Simulate fetching the entire dataset once
    const fullDataset = Array.from({ length: 53 }, (_, i) => { // Base dataset
      const date = new Date();
      date.setDate(date.getDate() - i);
      const score = 70 + Math.floor(Math.random() * 25);
      const feedbacks = [
          "步频稳定，姿态良好", "足外翻角度过大", "前后足压比例良好",
          "支撑相时间偏长", "整体表现良好", "垂直振幅偏大", "手臂摆动幅度不足"
      ];
      return {
        id: i + 1,
        date: date.toISOString().split('T')[0],
        duration: `${Math.floor(Math.random() * 40) + 20}分钟`,
        avgCadence: 165 + Math.floor(Math.random() * 20),
        avgStride: 100 + Math.floor(Math.random() * 25),
        avgScore: score,
        feedback: feedbacks[Math.floor(Math.random() * feedbacks.length)]
      }
    });

    // Filter by date range
    const filteredData = fullDataset.filter(r => {
        if (!dateRangeValue) return true;
        const recordDate = new Date(r.date);
        const startDate = new Date(dateRangeValue[0]);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(dateRangeValue[1]);
        endDate.setHours(23, 59, 59, 999);
        return recordDate >= startDate && recordDate <= endDate;
    });
    resolve(filteredData);
  });
}

// Function to update displayed records based on pagination and filters
const updateDisplayData = () => {
    loading.value = true;
    chartLoading.value = true; // Assuming chart updates too
    setTimeout(() => { // Simulate processing delay
        totalRecords.value = allHistoryData.value.length;
        const start = (currentPage.value - 1) * pageSize.value;
        const end = start + pageSize.value;
        historyRecords.value = allHistoryData.value.slice(start, end);

        // Update stats based on the filtered data (allHistoryData)
        const total = allHistoryData.value.length;
        statisticsData.value[0].value = total.toString();
        statisticsData.value[1].value = `${Math.round(total * 0.6)}小时`; // Example stat
        const avgScore = total > 0 ? (allHistoryData.value.reduce((sum, r) => sum + r.avgScore, 0) / total).toFixed(1) : 'N/A';
        statisticsData.value[2].value = avgScore;
        const maxScore = total > 0 ? Math.max(...allHistoryData.value.map(r => r.avgScore)) : 'N/A';
        statisticsData.value[3].value = maxScore.toString();

        loading.value = false;
        chartLoading.value = false;
         // Ensure trend chart is updated after data is processed
        nextTick(() => {
             updateTrendChart();
        });
    }, 300); // Short delay
}


// Load data function - Fetches all, then updates display
const loadHistoryData = async () => {
  loading.value = true;
  chartLoading.value = true;
  console.log("Fetching all history for range:", dateRange.value);
  allHistoryData.value = await mockFetchAllHistory(dateRange.value);
  currentPage.value = 1; // Reset to first page after filtering
  updateDisplayData();
}

// Pagination handlers
const handleSizeChange = (val: number) => {
  pageSize.value = val
  currentPage.value = 1 // Reset to first page
  updateDisplayData() // Update display based on new page size
}
const handleCurrentChange = (val: number) => {
  currentPage.value = val
  updateDisplayData() // Update display based on new page
}

// Score color utility
const getScoreColor = (score: number): string => {
  if (score >= 90) return '#67c23a';
  if (score >= 80) return '#409eff';
  if (score >= 70) return '#e6a23c';
  return '#f56c6c';
}

// Feedback color utility
const getFeedbackColor = (type: string): string => {
  switch (type) {
    case 'success': return '#67c23a';
    case 'warning': return '#e6a23c';
    case 'danger': return '#f56c6c';
    case 'primary': return '#409eff';
    default: return '#909399';
  }
}

// --- ECharts Initialization and Updates ---

// Trend Chart Options - Now uses allHistoryData
const getTrendChartOption = computed(() => {
  const sourceData = [...allHistoryData.value]; // Use the fully filtered dataset
  sourceData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort chronologically

  const xAxisData = sourceData.map(r => r.date);
  let seriesData: number[] = [];
  let seriesName = '';
  let yAxisName = '';
  let color = '#409EFF';

  switch (trendType.value) {
    case 'cadence':
      seriesData = sourceData.map(r => r.avgCadence);
      seriesName = '平均步频';
      yAxisName = '步/分';
      color = '#67C23A'; // Green for cadence
      break;
    case 'stride':
      seriesData = sourceData.map(r => r.avgStride);
      seriesName = '平均步幅';
      yAxisName = '厘米';
      color = '#E6A23C'; // Yellow for stride
      break;
    case 'score':
    default:
      seriesData = sourceData.map(r => r.avgScore);
      seriesName = '平均评分';
      yAxisName = '评分';
      color = '#409EFF'; // Blue for score
      break;
  }

  // Create gradient color based on the primary color
  const colorRgb = echarts.color.parse(color) as number[]; // Assert as number[]
  const areaColorStart = `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 0.2)`
  const areaColorEnd = `rgba(${colorRgb[0]}, ${colorRgb[1]}, ${colorRgb[2]}, 0)`

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => { // Custom formatter
          // Ensure params is an array and has elements
          if (!Array.isArray(params) || params.length === 0) return '';
          const param = params[0]; // Use the first series
          const date = param.axisValue;
          const value = param.value;
          const unit = yAxisName === '评分' ? '' : ` ${yAxisName}` ; // Add unit unless it's score
          return `${date}<br/>${param.marker}${seriesName}: <strong>${value}</strong>${unit}`;
      },
      backgroundColor: 'rgba(50, 50, 50, 0.7)', // Darker tooltip
      borderColor: '#333',
      textStyle: { color: '#fff' }
    },
    grid: { left: '3%', right: '5%', bottom: '10%', top: '15%', containLabel: true }, // Adjusted grid
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xAxisData,
      axisLine: { lineStyle: { color: '#aaa' } }
    },
    yAxis: {
      type: 'value',
      name: yAxisName,
      nameTextStyle: { color: '#666', padding: [0, 0, 0, 40] }, // Add padding to name
      scale: true, // Allow scaling
      axisLine: { show: true, lineStyle: { color: '#aaa' } },
      axisLabel: { color: '#666' },
      splitLine: { lineStyle: { color: '#eee' } } // Lighter split lines
    },
     dataZoom: [ // Add data zoom for better navigation
        {
            type: 'inside',
            start: Math.max(0, 100 - (30 / xAxisData.length * 100)), // Show last 30 points approx
            end: 100,
            filterMode: 'filter'
        },
        {
            type: 'slider', // Add slider dataZoom
            start: Math.max(0, 100 - (30 / xAxisData.length * 100)),
            end: 100,
            filterMode: 'filter',
            height: 25,
            bottom: 10
        }
    ],
    series: [
      {
        name: seriesName,
        type: 'line',
        smooth: 0.4, // Adjust smoothness
        symbol: 'circle', // Add symbols
        symbolSize: 6,
        showSymbol: xAxisData.length < 50, // Hide symbols if too many points
        data: seriesData,
        itemStyle: { color: color },
        lineStyle: { width: 2 },
        areaStyle: { // Add gradient area
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: areaColorStart },
                { offset: 1, color: areaColorEnd }
            ])
        }
      }
    ]
  };
});

// Detail Chart Options (Example) - Enhanced styling
const getDetailChartOption = (record: any) => {
   // Replace with actual data fetching/processing for the selected record
   const timestamps = ['00:05', '00:10', '00:15', '00:20', '00:25', '00:30', '00:35', '00:40'];
   const cadenceData = Array.from({ length: 8 }, () => record.avgCadence + Math.floor(Math.random() * 10) - 5);
   const scoreData = Array.from({ length: 8 }, () => record.avgScore + Math.floor(Math.random() * 8) - 4);

  return {
     tooltip: {
         trigger: 'axis',
         formatter: (params: any) => {
             if (!Array.isArray(params) || params.length === 0) return '';
             let res = params[0].axisValue + '<br/>';
             params.forEach((item:any) => {
                // Add strong tag for value
                res += `${item.marker}${item.seriesName}: <strong>${item.value}</strong>${item.seriesIndex === 0 ? ' bpm' : '分'}<br/>`;
             });
             return res;
         },
         backgroundColor: 'rgba(50, 50, 50, 0.7)',
         borderColor: '#333',
         textStyle: { color: '#fff' }
      },
     legend: { data: ['实时步频', '实时评分'], top: 10 }, // Adjust legend position
     grid: { left: '10%', right: '10%', bottom: '10%', top: '20%', containLabel: true }, // Adjust grid for two y-axes
     xAxis: {
         type: 'category',
         boundaryGap: false,
         data: timestamps,
         axisLine: { lineStyle: { color: '#aaa' } }
    },
     yAxis: [
        {
            type: 'value',
            name: '步频 (步/分)',
            min: 150,
            max: 190,
            position: 'left',
            axisLine: { show: true, lineStyle: { color: '#409EFF' } }, // Match series color
            axisLabel: { formatter: '{value}', color: '#666' },
            splitLine: { show: false } // Hide grid lines for primary axis
        },
        {
            type: 'value',
            name: '评分',
            min: 50,
            max: 100,
            position: 'right',
            axisLine: { show: true, lineStyle: { color: '#67C23A' } }, // Match series color
            axisLabel: { formatter: '{value}', color: '#666' },
            splitLine: { lineStyle: { color: '#eee' } } // Show grid lines for secondary
        }
     ],
     series: [
       {
            name: '实时步频',
            type: 'line',
            smooth: true,
            data: cadenceData,
            yAxisIndex: 0, // Link to left y-axis
            symbol: 'circle',
            symbolSize: 6,
            itemStyle: { color: '#409EFF' },
            lineStyle: { width: 2 }
        },
       {
            name: '实时评分',
            type: 'line',
            smooth: true,
            data: scoreData,
            yAxisIndex: 1, // Link to right y-axis
             symbol: 'circle',
            symbolSize: 6,
            itemStyle: { color: '#67C23A' },
            lineStyle: { width: 2 }
        }
     ]
   };
};

// Initialize Trend Chart
const initTrendChart = () => {
  if (trendChartRef.value) {
    // Dispose existing chart instance before re-initializing
     if (trendChart) {
      trendChart.dispose();
    }
    trendChart = echarts.init(trendChartRef.value);
    trendChart.setOption(getTrendChartOption.value as echarts.EChartsOption);
    // Add listener for dataZoom events to potentially load more data in a real scenario
    trendChart.on('datazoom', () => {
       console.log('Data zoomed/panned');
       // Placeholder for future logic if needed
    });
  } else {
     console.error("Trend chart ref not found during init");
  }
}

// Update Trend Chart - Re-initializes with new options based on computed property
const updateTrendChart = () => {
  chartLoading.value = true;
  // Ensure DOM is ready and chart ref exists
  nextTick(() => {
      if (trendChartRef.value) {
         // Set option with notMerge = true to replace instead of merge
         trendChart?.setOption(getTrendChartOption.value as echarts.EChartsOption, true);
         setTimeout(() => chartLoading.value = false, 300); // Visual delay
      } else {
         console.error("Trend chart ref not found during update");
         chartLoading.value = false;
      }
  });
}

// Initialize Detail Chart
const initDetailChart = (record: any) => {
   detailChartLoading.value = true;
   nextTick(() => { // Ensure DOM is ready
      if (detailChartRef.value) {
        // Dispose previous instance if exists
        if (detailChart) {
           detailChart.dispose();
        }
        detailChart = echarts.init(detailChartRef.value);
        // Simulate fetching detail data and setting options
         setTimeout(() => {
            detailChart?.setOption(getDetailChartOption(record) as echarts.EChartsOption);
            detailChartLoading.value = false;
         }, 500);
      } else {
          console.error("Detail chart ref not found");
          detailChartLoading.value = false;
      }
   });
}

// Resize charts on window resize
const handleResize = () => {
  trendChart?.resize();
  detailChart?.resize();
}

// View Detail Action
const viewDetail = (row: any) => {
  console.log("Viewing detail for:", row);
  selectedRecord.value = row;
  detailDialogVisible.value = true;
  activeDetailTab.value = 'chart'; // Reset to default tab
  // Defer chart initialization until dialog is fully rendered and tab is active
}

// Watch active tab to initialize chart
watch(activeDetailTab, (newTab) => {
  if (newTab === 'chart' && detailDialogVisible.value && selectedRecord.value) {
     console.log("Chart tab selected, initializing detail chart...");
     // Ensure DOM ref is available before initializing
     nextTick(() => {
        initDetailChart(selectedRecord.value);
     });
  }
});

// Watch dialog visibility to potentially resize chart
watch(detailDialogVisible, (isVisible) => {
    if(isVisible && activeDetailTab.value === 'chart') { // Check if tab is active
        nextTick(() => {
            // Ensure chart instance exists before resizing
            if (detailChart) {
               detailChart.resize();
            } else if (selectedRecord.value) {
               // If chart wasn't initialized (e.g., dialog opened directly to chart tab)
               // initDetailChart(selectedRecord.value);
               // Decided against auto-init here, rely on tab watch
            }
        });
    }
});


// Lifecycle Hooks
onMounted(() => {
  loadHistoryData(); // Load initial data
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose();
  detailChart?.dispose();
})

</script>

<style scoped>
.history-view {
  padding: 20px;
  background-color: var(--el-color-primary-light-9); /* Consistent background */
}

/* Header Card */
.page-header-card {
  margin-bottom: 24px;
  border: none;
  border-radius: 10px; /* Added border radius */
  box-shadow: var(--el-box-shadow-light); /* Added shadow */
}

:deep(.page-header-card .el-card__body) {
  padding: 15px 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap; /* Allow wrapping */
  gap: 15px; /* Space between title and filters */
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
}

.filter-controls {
  display: flex;
  align-items: center;
  gap: 10px; /* Space between controls */
}

.date-picker {
  width: 250px;
}

/* Stat Cards */
.stat-cards-row {
  margin-bottom: 24px !important; /* Override default el-row margin */
}

.stat-card {
  border-radius: 10px;
  border: 1px solid var(--el-border-color-lighter);
  transition: all 0.3s ease; /* Added transition */
}

.stat-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--el-box-shadow);
}

.stat-card-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.stat-icon-wrapper {
   width: 50px;
   height: 50px;
   border-radius: 50%;
   display: flex;
   align-items: center;
   justify-content: center;
   flex-shrink: 0;
}

.stat-info {
  flex-grow: 1;
  min-width: 0; /* Prevent overflow */
}

.stat-value {
  font-size: 1.6rem;
  font-weight: bold;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-label {
  font-size: 0.9rem;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Trend Card */
.trend-card,
.history-table-card {
  margin-bottom: 24px;
  border: 1px solid var(--el-border-color-lighter); /* Use lighter border */
  border-radius: 10px;
  background-color: #fff; /* Explicit white background */
}

/* Common Card Header Style */
:deep(.trend-card .el-card__header),
:deep(.history-table-card .el-card__header) {
  background-color: #fff; /* Keep header white */
  border-bottom: 1px solid var(--el-border-color-lighter);
  padding: 12px 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.chart-container {
  height: 350px; /* Fixed height for chart */
  width: 100%;
}

/* History Table Card */
:deep(.history-table-card .el-card__body) {
  padding: 0; /* Remove padding to let table fill */
}

.history-table {
  cursor: pointer; /* Indicate rows are clickable */
}

/* Style table rows on hover */
:deep(.history-table .el-table__row:hover) {
    background-color: var(--el-color-primary-light-9) !important;
}

.score-cell {
  display: flex;
  align-items: center;
}

.unit {
  font-size: 0.8em;
  color: var(--el-text-color-secondary);
  margin-left: 3px;
}

.pagination-container {
  padding: 15px 20px;
  display: flex;
  justify-content: flex-end;
  background-color: #fff; /* Ensure pagination bg is white */
  border-top: 1px solid var(--el-border-color-lighter);
  border-radius: 0 0 10px 10px; /* Match card radius */
}

/* Detail Dialog */
.detail-dialog .el-dialog__header {
  border-bottom: 1px solid var(--el-border-color-lighter);
  margin-right: 0; /* Override default margin */
  padding: 15px 25px; /* Adjust padding */
}

.detail-dialog .el-dialog__body {
  padding: 0; /* Remove body padding */
}

.detail-layout {
  height: calc(80vh); /* Set a height for the container inside dialog, increased */
  display: flex; /* Ensure flex layout works */
  flex-direction: column;
}

.detail-dialog-header {
  padding: 15px 25px; /* Reduced padding */
  border-bottom: 1px solid var(--el-border-color-lighter);
  background-color: #fafbfc; /* Slightly different bg */
  flex-shrink: 0; /* Prevent header shrinking */
}

.detail-meta {
  display: flex;
  align-items: center;
  gap: 10px; /* Reduced gap */
  font-size: 0.9rem; /* Slightly smaller font */
  color: var(--el-text-color-regular); /* Regular color */
  flex-wrap: wrap; /* Allow wrap */
}

.detail-meta .el-icon {
  margin-right: 4px;
  vertical-align: middle;
  color: var(--el-text-color-secondary);
}
.detail-meta .el-divider--vertical {
  height: 1.2em; /* Adjusted height */
  margin: 0 5px;
}

.detail-score {
  text-align: center;
}

.detail-score .el-progress {
  margin-bottom: -5px; /* Adjust spacing with label */
}


.detail-score .score-label {
  font-size: 0.85rem;
  color: var(--el-text-color-secondary);
  margin-top: 5px;
}

.detail-dialog-main {
  padding: 0px; /* Remove padding */
  overflow-y: auto; /* Allow scrolling for main content */
  flex-grow: 1; /* Allow main to grow */
  background-color: #f9fafc; /* Slightly different bg for main area */
}

.detail-tabs {
  padding: 0 25px 20px; /* Add padding around tabs content */
}

/* Style Tabs */
:deep(.detail-tabs .el-tabs__header) {
   margin: 0 0 20px; /* Adjust tab header margin */
   padding: 0 25px; /* Add padding to header */
   background-color: #fff; /* White background for header */
   border-bottom: 1px solid var(--el-border-color-lighter);
}
:deep(.detail-tabs .el-tabs__nav-wrap::after) {
    display: none; /* Remove default bottom border */
}
:deep(.detail-tabs .el-tabs__item) {
    height: 50px; /* Increase tab height */
    line-height: 50px;
    font-size: 1rem;
}
:deep(.detail-tabs .el-tabs__item.is-active) {
    font-weight: 600;
}
:deep(.detail-tabs .el-tabs__active-bar) {
    height: 3px; /* Thicker active bar */
}


.detail-chart-container {
  height: 320px; /* Height for the detail chart, slightly increased */
  width: 100%;
  background-color: #fff; /* Ensure chart container has white background */
  padding: 15px;
  border-radius: 4px;
  border: 1px solid var(--el-border-color-lighter);
}

.key-metrics-analysis {
   padding-top: 10px;
   background-color: #fff;
   padding: 20px;
   border-radius: 4px;
   border: 1px solid var(--el-border-color-lighter);
}

.feedback-section {
  padding-top: 10px;
  background-color: #fff;
   padding: 20px;
   border-radius: 4px;
   border: 1px solid var(--el-border-color-lighter);
}

.feedback-title {
   font-size: 1.05rem; /* Adjusted size */
   font-weight: 600;
   margin: 0 0 15px; /* Adjusted margin */
   color: var(--el-text-color-primary);
   padding-bottom: 10px;
   border-bottom: 1px solid var(--el-border-color-lighter);
}
.feedback-title:first-of-type {
    margin-top: 0; /* Remove top margin for first title */
}

.feedback-summary {
  margin-bottom: 25px;
  padding: 10px 15px;
  background-color: #f4f4f5;
  border-radius: 4px;
  color: var(--el-text-color-regular);
  line-height: 1.6;
}

.feedback-timeline {
  padding-left: 5px; /* Adjust timeline padding */
}

.timeline-card {
   border-left-width: 3px;
   border-left-style: solid;
   margin-bottom: 10px; /* Increased space between cards */
   border-radius: 4px;
   border: 1px solid var(--el-border-color-lighter); /* Add subtle border */
   background-color: #fff; /* Ensure card background is white */
}

.timeline-card p {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.5;
}

.timeline-card :deep(.el-card__body) {
  padding: 12px 15px;
}

/* Set card border color based on type */
.el-timeline-item[type="success"] .timeline-card { border-left-color: #67c23a; }
.el-timeline-item[type="warning"] .timeline-card { border-left-color: #e6a23c; }
.el-timeline-item[type="danger"] .timeline-card { border-left-color: #f56c6c; }
.el-timeline-item[type="primary"] .timeline-card { border-left-color: #409eff; }

:deep(.el-timeline-item__timestamp) {
    font-size: 0.85rem; /* Adjust timestamp font size */
}

:deep(.detail-dialog .el-dialog__footer) {
    border-top: 1px solid var(--el-border-color-lighter);
    padding: 10px 25px; /* Adjust footer padding */
    background-color: #fff; /* Ensure footer is white */
}

/* Responsive */
@media (max-width: 992px) { /* Adjust breakpoint */
   .detail-layout {
       height: calc(90vh); /* Increase height on medium screens */
   }
}

@media (max-width: 768px) {
  .history-view {
      padding: 15px; /* Reduce padding on mobile */
  }
  .page-header-card, .trend-card, .history-table-card, .stat-cards-row {
      margin-bottom: 15px; /* Reduce bottom margin */
  }
  .header-content {
    flex-direction: column;
    align-items: flex-start;
  }
  .filter-controls {
    flex-wrap: wrap;
    width: 100%;
  }
  .date-picker {
    width: 100%; /* Full width on small screens */
  }
  .filter-controls .el-button {
    width: 100%;
  }
  .stat-value {
    font-size: 1.4rem;
  }
  .stat-label {
      font-size: 0.85rem;
  }
  .chart-container {
    height: 300px;
  }
  .detail-dialog {
     width: 95% !important; /* Dialog width on mobile */
     top: 2vh !important;
  }
  .detail-layout {
     height: calc(90vh); /* Increase height on mobile too */
  }
  .detail-dialog-header .el-row {
      flex-direction: column-reverse; /* Stack score below meta */
      gap: 15px;
  }
   .detail-dialog-header .el-col {
      width: 100% !important;
      max-width: 100%;
      text-align: center;
   }
   .detail-meta {
       justify-content: center;
       flex-wrap: wrap;
       font-size: 0.85rem;
       gap: 8px;
   }
   .detail-score .el-progress {
      width: 80px !important; /* Smaller progress */
      height: 80px !important;
      margin: 0 auto 5px; /* Center progress and add bottom margin*/
   }
    .detail-score .score-label {
        font-size: 0.8rem;
    }
   :deep(.detail-tabs .el-tabs__header), .detail-tabs {
       padding: 0 15px 15px; /* Reduce padding on mobile */
   }
   :deep(.detail-tabs .el-tabs__item) {
        height: 45px;
        line-height: 45px;
        font-size: 0.95rem;
   }
   .detail-chart-container, .key-metrics-analysis, .feedback-section {
       padding: 15px;
   }
   :deep(.detail-dialog .el-dialog__footer) {
       padding: 10px 15px;
   }
}

</style>

<template>
  <div class="upload-data-view">
    <h1>上传训练数据</h1>
    <div class="upload-container">
      <el-form :model="formData" label-width="120px" label-position="top">
        <el-form-item label="训练名称">
          <el-input v-model="formData.trainingName" placeholder="请输入训练名称" />
        </el-form-item>
        
        <el-form-item label="训练日期">
          <el-date-picker
            v-model="formData.trainingDate"
            type="datetime"
            placeholder="选择日期和时间"
            format="YYYY/MM/DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="足压数据 (CSV格式)">
              <el-upload
                class="upload-dragger"
                drag
                action="#"
                :auto-upload="false"
                :on-change="handleFootPressureUpload"
                :limit="1">
                <el-icon class="el-icon--upload"><upload-filled /></el-icon>
                <div class="el-upload__text">拖拽文件至此处或<em>点击上传</em></div>
                <template #tip>
                  <div class="el-upload__tip">
                    请上传足压传感器CSV格式数据文件
                  </div>
                </template>
              </el-upload>
            </el-form-item>
          </el-col>
          
          <el-col :span="12">
            <el-form-item label="IMU传感器数据 (TXT格式)">
              <el-upload
                class="upload-dragger"
                drag
                action="#"
                :auto-upload="false"
                :on-change="handleImuUpload"
                :limit="1">
                <el-icon class="el-icon--upload"><upload-filled /></el-icon>
                <div class="el-upload__text">拖拽文件至此处或<em>点击上传</em></div>
                <template #tip>
                  <div class="el-upload__tip">
                    请上传IMU传感器TXT格式数据文件
                  </div>
                </template>
              </el-upload>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item>
          <el-button type="primary" :loading="processing" @click="processData">处理数据</el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 数据预览部分 -->
    <div v-if="showPreview" class="preview-container">
      <h2>数据预览</h2>

      <el-tabs>
        <el-tab-pane label="足压数据">
          <div class="data-summary">
            <p><strong>数据点数量:</strong> {{ pressureDataSummary.totalPoints }}</p>
            <p><strong>采样频率:</strong> {{ pressureDataSummary.frequency }}Hz</p>
            <p><strong>持续时间:</strong> {{ pressureDataSummary.duration }}秒</p>
          </div>
          
          <el-table v-if="footPressureDataPreview.length > 0" :data="footPressureDataPreview" height="250" border style="width: 100%">
            <el-table-column prop="timestamp" label="时间戳" width="180"></el-table-column>
            <el-table-column prop="leftTotal" label="左脚压力总和 (g)"></el-table-column>
            <el-table-column prop="rightTotal" label="右脚压力总和 (g)"></el-table-column>
            <el-table-column prop="total" label="总压力 (g)"></el-table-column>
          </el-table>
        </el-tab-pane>
        
        <el-tab-pane label="IMU数据">
          <div class="data-summary">
            <p><strong>数据点数量:</strong> {{ imuDataSummary.totalPoints }}</p>
            <p><strong>采样频率:</strong> {{ imuDataSummary.frequency }}Hz</p>
            <p><strong>持续时间:</strong> {{ imuDataSummary.duration }}秒</p>
          </div>
          
          <el-table v-if="imuDataPreview.length > 0" :data="imuDataPreview" height="250" border style="width: 100%">
            <el-table-column prop="index" label="序号" width="80"></el-table-column>
            <el-table-column prop="ax" label="AX (g)"></el-table-column>
            <el-table-column prop="ay" label="AY (g)"></el-table-column>
            <el-table-column prop="az" label="AZ (g)"></el-table-column>
            <el-table-column prop="gx" label="GX (°/s)"></el-table-column>
            <el-table-column prop="gy" label="GY (°/s)"></el-table-column>
            <el-table-column prop="gz" label="GZ (°/s)"></el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>

      <div class="action-buttons">
        <el-button type="success" @click="goToAnalysis">进入深度分析</el-button>
        <el-button @click="resetForm">重新上传</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { UploadFilled } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { processFootPressureData, processImuData } from '../services/dataProcessingService';

const router = useRouter();

// 表单数据
const formData = reactive({
  trainingName: '',
  trainingDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
  footPressureFile: null,
  imuFile: null
});

// 处理状态和预览控制
const processing = ref(false);
const showPreview = ref(false);

// 处理后的数据和预览数据
const processedData = reactive({
  footPressure: [],
  imu: [],
  summary: {}
});

const footPressureDataPreview = ref([]);
const imuDataPreview = ref([]);

const pressureDataSummary = ref({
  totalPoints: 0,
  frequency: 0,
  duration: 0
});

const imuDataSummary = ref({
  totalPoints: 0,
  frequency: 0,
  duration: 0
});

// 处理足压数据上传
const handleFootPressureUpload = (file) => {
  formData.footPressureFile = file.raw;
};

// 处理IMU数据上传
const handleImuUpload = (file) => {
  formData.imuFile = file.raw;
};

// 处理上传的数据
const processData = async () => {
  // 表单验证
  if (!formData.trainingName) {
    ElMessage.warning('请输入训练名称');
    return;
  }

  if (!formData.footPressureFile && !formData.imuFile) {
    ElMessage.warning('请至少上传一种数据文件');
    return;
  }

  processing.value = true;
  
  try {
    // 读取和处理足压数据
    if (formData.footPressureFile) {
      const footPressureText = await readFileAsText(formData.footPressureFile);
      const { processedData: footPressureData, summary } = await processFootPressureData(footPressureText);
      
      processedData.footPressure = footPressureData;
      pressureDataSummary.value = summary;
      
      // 生成预览数据 (最多10条)
      footPressureDataPreview.value = footPressureData.slice(0, 10).map(item => ({
        timestamp: item.timestamp,
        leftTotal: Math.round(item.leftTotal),
        rightTotal: Math.round(item.rightTotal),
        total: Math.round(item.leftTotal + item.rightTotal)
      }));
    }

    // 读取和处理IMU数据
    if (formData.imuFile) {
      const imuText = await readFileAsText(formData.imuFile);
      const { processedData: imuData, summary } = await processImuData(imuText);
      
      processedData.imu = imuData;
      imuDataSummary.value = summary;
      
      // 生成预览数据 (最多10条)
      imuDataPreview.value = imuData.slice(0, 10).map((item, index) => ({
        index: index + 1,
        ax: item.ax,
        ay: item.ay,
        az: item.az,
        gx: item.gx,
        gy: item.gy,
        gz: item.gz
      }));
    }

    // 显示预览
    showPreview.value = true;
    
    // 存储处理后的数据到localStorage，供深度分析页面使用
    localStorage.setItem('trainingData', JSON.stringify({
      name: formData.trainingName,
      date: formData.trainingDate,
      footPressure: processedData.footPressure,
      imu: processedData.imu,
      summary: {
        pressure: pressureDataSummary.value,
        imu: imuDataSummary.value
      }
    }));

    ElMessage.success('数据处理成功');
  } catch (error) {
    console.error('处理数据出错:', error);
    ElMessage.error('处理数据时出现错误: ' + error.message);
  } finally {
    processing.value = false;
  }
};

// 文件读取函数
const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
};

// 重置表单
const resetForm = () => {
  formData.trainingName = '';
  formData.trainingDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
  formData.footPressureFile = null;
  formData.imuFile = null;
  
  processedData.footPressure = [];
  processedData.imu = [];
  
  footPressureDataPreview.value = [];
  imuDataPreview.value = [];
  
  showPreview.value = false;
  
  // 清除本地存储
  localStorage.removeItem('trainingData');
};

// 进入深度分析页面
const goToAnalysis = () => {
  router.push('/analysis');
};
</script>

<style scoped>
.upload-data-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
}

.upload-container {
  background-color: var(--el-bg-color);
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.upload-dragger {
  width: 100%;
}

.preview-container {
  background-color: var(--el-bg-color);
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.data-summary {
  margin-bottom: 20px;
  padding: 15px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
}

.action-buttons {
  margin-top: 30px;
  text-align: center;
}
</style>
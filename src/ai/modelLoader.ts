/**
 * AI模型加载器
 * 负责加载和初始化TensorFlow.js模型
 */

import * as tf from '@tensorflow/tfjs';
import { ModelStatus } from './types';

// 模型URL，实际应用中这些会指向真实模型文件
const MODEL_URLS = {
  gaitCycle: '/models/gait_cycle_model/model.json',
  abnormalityDetection: '/models/abnormality_detection/model.json',
  strideAnalysis: '/models/stride_analysis/model.json'
};

// 模型缓存
let models: {
  gaitCycle: tf.LayersModel | null;
  abnormalityDetection: tf.LayersModel | null;
  strideAnalysis: tf.LayersModel | null;
} = {
  gaitCycle: null,
  abnormalityDetection: null,
  strideAnalysis: null
};

// 模型状态
let modelStatus: ModelStatus = ModelStatus.INACTIVE;

// 调试模式
let debugMode = false;

/**
 * 初始化TensorFlow环境
 */
export async function initializeTensorFlow(debug = false): Promise<void> {
  debugMode = debug;

  if (debugMode) {
    console.log('[AI] 初始化TensorFlow.js环境');
  }

  try {
    // 设置TensorFlow.js环境
    await tf.ready();

    if (debugMode) {
      console.log('[AI] TensorFlow.js环境初始化完成');
      // 打印当前后端
      console.log('[AI] 当前TensorFlow后端:', tf.getBackend());
    }

    // 尝试使用WebGL后端以获得更好性能
    if (tf.getBackend() !== 'webgl') {
      try {
        await tf.setBackend('webgl');
        if (debugMode) {
          console.log('[AI] 已切换到WebGL后端');
        }
      } catch (err) {
        console.warn('[AI] 无法切换到WebGL后端，使用默认后端', err);
      }
    }

    // 监听硬件加速情况
    const gpuInfo = await tf.env().getGPGPUContext?.() || null;
    if (debugMode && gpuInfo) {
      console.log('[AI] GPU加速可用');
    } else if (debugMode) {
      console.log('[AI] 使用CPU计算');
    }

  } catch (error) {
    console.error('[AI] TensorFlow.js初始化错误:', error);
    throw new Error('TensorFlow.js初始化失败');
  }
}

/**
 * 加载所有AI模型
 */
export async function loadModels(): Promise<void> {
  if (modelStatus === ModelStatus.LOADING) {
    if (debugMode) console.log('[AI] 模型已在加载中');
    return;
  }

  modelStatus = ModelStatus.LOADING;

  if (debugMode) console.log('[AI] 开始加载AI模型');

  try {
    // 由于我们目前没有实际模型文件，创建模拟模型用于演示
    // 在实际应用中，这里应该使用tf.loadLayersModel加载预训练模型
    models.gaitCycle = await createMockGaitCycleModel();
    models.abnormalityDetection = await createMockAbnormalityModel();
    models.strideAnalysis = await createMockStrideModel();

    // 预热模型
    if (debugMode) console.log('[AI] 预热模型中...');
    await warmupModels();

    modelStatus = ModelStatus.READY;
    if (debugMode) console.log('[AI] 所有模型加载完成');
  } catch (error) {
    console.error('[AI] 模型加载失败:', error);
    modelStatus = ModelStatus.ERROR;
    throw new Error('模型加载失败');
  }
}

/**
 * 获取当前模型状态
 */
export function getModelStatus(): ModelStatus {
  return modelStatus;
}

/**
 * 检查模型是否已加载
 */
export function isModelReady(): boolean {
  return modelStatus === ModelStatus.READY;
}

/**
 * 获取已加载的模型
 */
export function getModels() {
  if (!isModelReady()) {
    throw new Error('模型尚未加载完成');
  }
  return models;
}

/**
 * 清理模型资源
 */
export async function disposeModels(): Promise<void> {
  if (models.gaitCycle) {
    models.gaitCycle.dispose();
    models.gaitCycle = null;
  }

  if (models.abnormalityDetection) {
    models.abnormalityDetection.dispose();
    models.abnormalityDetection = null;
  }

  if (models.strideAnalysis) {
    models.strideAnalysis.dispose();
    models.strideAnalysis = null;
  }

  modelStatus = ModelStatus.INACTIVE;
  if (debugMode) console.log('[AI] 模型资源已释放');
}

/**
 * 创建模拟步态周期检测模型
 * 实际应用中，这个函数将被替换为加载真实的预训练模型
 */
async function createMockGaitCycleModel(): Promise<tf.LayersModel> {
  // 创建一个简单的模型，用于步态周期检测
  const model = tf.sequential();

  // 添加LSTM层，适合处理时序数据
  model.add(tf.layers.lstm({
    units: 32,
    inputShape: [10, 3], // 10个时间步，每步3个特征（加速度x,y,z）
    returnSequences: false
  }));

  // 添加Dense层进行分类
  model.add(tf.layers.dense({
    units: 8,  // 输出8个类别，对应8个步态周期阶段
    activation: 'softmax'
  }));

  // 编译模型
  model.compile({
    optimizer: tf.train.adam(),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });

  // 假装等待模型加载，模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 1000));

  return model;
}

/**
 * 创建模拟步态异常检测模型
 */
async function createMockAbnormalityModel(): Promise<tf.LayersModel> {
  const model = tf.sequential();

  // 创建一个CNN+LSTM混合模型，适合检测步态异常
  model.add(tf.layers.conv1d({
    filters: 16,
    kernelSize: 3,
    activation: 'relu',
    inputShape: [20, 7]  // 20个时间步，每步7个特征
  }));

  model.add(tf.layers.maxPooling1d({
    poolSize: 2
  }));

  model.add(tf.layers.lstm({
    units: 32,
    returnSequences: false
  }));

  // 多标签分类层，对应多种可能的异常
  model.add(tf.layers.dense({
    units: 9,  // 9种异常类型
    activation: 'sigmoid'  // 多标签分类使用sigmoid
  }));

  model.compile({
    optimizer: tf.train.adam(),
    loss: 'binaryCrossentropy',
    metrics: ['accuracy']
  });

  // 模拟加载时间
  await new Promise(resolve => setTimeout(resolve, 800));

  return model;
}

/**
 * 创建模拟步幅分析模型
 */
async function createMockStrideModel(): Promise<tf.LayersModel> {
  const model = tf.sequential();

  // 创建回归模型，用于分析步幅、接触时间等指标
  model.add(tf.layers.dense({
    units: 32,
    activation: 'relu',
    inputShape: [15]  // 15个输入特征
  }));

  model.add(tf.layers.dropout({
    rate: 0.2
  }));

  model.add(tf.layers.dense({
    units: 16,
    activation: 'relu'
  }));

  model.add(tf.layers.dense({
    units: 7,  // 7个输出指标
    activation: 'linear'  // 回归问题使用线性激活
  }));

  model.compile({
    optimizer: tf.train.rmsprop(),
    loss: 'meanSquaredError'
  });

  // 模拟加载时间
  await new Promise(resolve => setTimeout(resolve, 600));

  return model;
}

/**
 * 预热模型，运行一些样本以确保模型正常工作
 */
async function warmupModels(): Promise<void> {
  if (!models.gaitCycle || !models.abnormalityDetection || !models.strideAnalysis) {
    throw new Error('模型未加载，无法预热');
  }

  try {
    // 创建一些随机输入数据进行测试推理
    const gaitInput = tf.randomNormal([1, 10, 3]);
    const abnormalityInput = tf.randomNormal([1, 20, 7]);
    const strideInput = tf.randomNormal([1, 15]);

    // 运行模型推理
    const gaitOutput = models.gaitCycle.predict(gaitInput);
    const abnormalityOutput = models.abnormalityDetection.predict(abnormalityInput);
    const strideOutput = models.strideAnalysis.predict(strideInput);

    // 释放临时张量
    tf.dispose([gaitInput, abnormalityInput, strideInput, gaitOutput, abnormalityOutput, strideOutput]);

    if (debugMode) console.log('[AI] 模型预热完成');
  } catch (error) {
    console.error('[AI] 模型预热失败:', error);
    throw new Error('模型预热失败');
  }
}

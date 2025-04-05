/**
 * AI引擎
 * 整合TensorFlow.js、专家系统和个性化学习模块
 */

import * as tf from '@tensorflow/tfjs';
import {
  SensorData,
  AnalysisResult,
  ModelStatus,
  Suggestion,
  AIEngineConfig,
  GaitPhase,
  FootStrikePattern,
  GaitAbnormality
} from './types';
import {
  initializeTensorFlow,
  loadModels,
  isModelReady,
  getModelStatus,
  getModels,
  disposeModels
} from './modelLoader';
import { initExpertSystem, analyzeWithExpertSystem } from './expertSystem';
import {
  initPersonalization,
  personalizeAnalysis,
  generatePersonalizedSuggestions,
  analyzeHistoryForImprovements
} from './personalization';

// 传感器数据缓冲区 (用于时序分析)
const sensorDataBuffer: SensorData[] = [];
const MAX_BUFFER_SIZE = 100; // 最大缓冲区大小

// 最近一次分析结果
let lastAnalysisResult: AnalysisResult | null = null;

// 引擎配置
let config: AIEngineConfig = {
  useTensorFlow: true,
  useExpertSystem: true,
  usePersonalization: true,
  sensorFrequency: 10, // 默认10Hz的传感器采样率
  debugMode: false
};

// 引擎状态
let engineInitialized = false;
let engineRunning = false;

/**
 * 初始化AI引擎
 */
export async function initializeAIEngine(userConfig?: Partial<AIEngineConfig>): Promise<void> {
  // 合并用户配置
  config = { ...config, ...userConfig };

  if (config.debugMode) {
    console.log('[Engine] 初始化AI引擎');
    console.log('[Engine] 配置:', JSON.stringify(config, null, 2));
  }

  try {
    // 初始化专家系统
    if (config.useExpertSystem) {
      initExpertSystem(config.debugMode);
    }

    // 初始化个性化模块
    if (config.usePersonalization) {
      initPersonalization(config.debugMode);
    }

    // 初始化TensorFlow.js
    if (config.useTensorFlow) {
      await initializeTensorFlow(config.debugMode);
      await loadModels();
    }

    engineInitialized = true;
    if (config.debugMode) {
      console.log('[Engine] AI引擎初始化完成');
    }
  } catch (error) {
    console.error('[Engine] 初始化AI引擎失败:', error);
    throw new Error('初始化AI引擎失败');
  }
}

/**
 * 添加传感器数据
 */
export function addSensorData(data: SensorData): void {
  if (!engineInitialized) {
    throw new Error('AI引擎尚未初始化');
  }

  // 添加到缓冲区
  sensorDataBuffer.push(data);

  // 限制缓冲区大小
  if (sensorDataBuffer.length > MAX_BUFFER_SIZE) {
    sensorDataBuffer.shift();
  }
}

/**
 * 分析当前数据
 */
export async function analyze(): Promise<{
  analysis: AnalysisResult;
  suggestions: Suggestion[];
}> {
  if (!engineInitialized) {
    throw new Error('AI引擎尚未初始化');
  }

  if (sensorDataBuffer.length < 5) {
    throw new Error('数据样本不足');
  }

  // 获取最新数据
  const latestData = sensorDataBuffer[sensorDataBuffer.length - 1];

  // 使用TensorFlow.js预测 (如果可用)
  let tfAnalysis: Partial<AnalysisResult> | null = null;
  if (config.useTensorFlow && isModelReady()) {
    tfAnalysis = await predictWithTensorFlow(latestData);
  }

  // 使用专家系统分析
  let expertResult: {
    updatedAnalysis: AnalysisResult;
    suggestions: Suggestion[];
  } | null = null;

  if (config.useExpertSystem) {
    expertResult = analyzeWithExpertSystem(
      latestData,
      sensorDataBuffer.slice(0, -1), // 历史数据
      lastAnalysisResult || undefined
    );
  }

  // 合并分析结果
  let analysis: AnalysisResult;
  if (expertResult) {
    // 使用专家系统结果作为基础
    analysis = expertResult.updatedAnalysis;

    // 如果有TensorFlow结果，合并进来
    if (tfAnalysis) {
      // 合并异常
      if (tfAnalysis.abnormalities) {
        for (const abnormality of tfAnalysis.abnormalities) {
          if (!analysis.abnormalities.includes(abnormality)) {
            analysis.abnormalities.push(abnormality);
          }
        }
      }

      // 合并评分 (加权平均)
      if (tfAnalysis.scores) {
        for (const key of Object.keys(tfAnalysis.scores) as Array<keyof typeof tfAnalysis.scores>) {
          const tfWeight = tfAnalysis.confidence || 0.7;
          const expertWeight = 1 - tfWeight;

          if (analysis.scores[key] !== undefined && tfAnalysis.scores[key] !== undefined) {
            analysis.scores[key] =
              analysis.scores[key] * expertWeight +
              tfAnalysis.scores[key]! * tfWeight;
          }
        }
      }

      // 更新置信度 (取较高值)
      if (tfAnalysis.confidence && tfAnalysis.confidence > analysis.confidence) {
        analysis.confidence = tfAnalysis.confidence;
      }
    }
  } else if (tfAnalysis && tfAnalysis.scores && tfAnalysis.metrics && tfAnalysis.confidence) {
    // 仅使用TensorFlow结果
    analysis = {
      gaitPhase: tfAnalysis.gaitPhase || GaitPhase.MID_STANCE,
      footStrikePattern: tfAnalysis.footStrikePattern || FootStrikePattern.MIDFOOT,
      abnormalities: tfAnalysis.abnormalities || [],
      metrics: tfAnalysis.metrics,
      scores: tfAnalysis.scores,
      confidence: tfAnalysis.confidence
    };
  } else {
    // 没有任何分析结果，创建一个基本结果
    analysis = createDefaultAnalysis(latestData);
  }

  // 应用个性化
  if (config.usePersonalization) {
    analysis = personalizeAnalysis(analysis, latestData);
  }

  // 收集建议
  let suggestions: Suggestion[] = [];

  // 1. 添加专家系统建议
  if (expertResult) {
    suggestions.push(...expertResult.suggestions);
  }

  // 2. 添加个性化建议
  if (config.usePersonalization) {
    const personalSuggestions = generatePersonalizedSuggestions(analysis, latestData);
    for (const suggestion of personalSuggestions) {
      if (!suggestions.some(s => s.text === suggestion.text)) {
        suggestions.push(suggestion);
      }
    }

    // 基于历史数据的建议
    const historySuggestions = analyzeHistoryForImprovements();
    for (const suggestion of historySuggestions) {
      if (!suggestions.some(s => s.text === suggestion.text)) {
        suggestions.push(suggestion);
      }
    }
  }

  // 按优先级排序建议
  suggestions.sort((a, b) => b.priority - a.priority);

  // 限制建议数量
  suggestions = suggestions.slice(0, 5);

  // 保存分析结果
  lastAnalysisResult = analysis;

  return {
    analysis,
    suggestions
  };
}

/**
 * 使用TensorFlow.js进行预测
 */
async function predictWithTensorFlow(data: SensorData): Promise<Partial<AnalysisResult>> {
  try {
    const models = getModels();

    // 检查模型是否可用
    if (!models || !models.gaitCycle || !models.abnormalityDetection || !models.strideAnalysis) {
      console.error('[Engine] 模型未加载完成，无法进行预测');
      return {};
    }

    // 准备输入数据
    // 1. 步态周期分类
    const recentAcceleration = sensorDataBuffer
      .slice(-10)
      .map(d => [d.acceleration[1], d.acceleration[2], d.acceleration[3]]);

    const gaitInput = tf.tensor3d([recentAcceleration]);

    // 2. 异常检测
    const features = [];
    for (let i = Math.max(0, sensorDataBuffer.length - 20); i < sensorDataBuffer.length; i++) {
      const sample = sensorDataBuffer[i];
      features.push([
        sample.acceleration[1], // x加速度
        sample.acceleration[2], // y加速度
        sample.acceleration[3], // z加速度
        sample.pressure[1],     // 前脚掌压力
        sample.pressure[2],     // 中脚掌压力
        sample.pressure[3],     // 后脚掌压力
        sample.pressure[4]      // 外侧压力
      ]);
    }

    // 填充到20个样本
    while (features.length < 20) {
      features.unshift(Array(7).fill(0));
    }

    const abnormalityInput = tf.tensor3d([features]);

    // 3. 步幅分析
    const strideFeatures = [
      // 当前数据
      data.cadence,
      data.strideLength,
      data.acceleration[1],
      data.acceleration[2],
      data.acceleration[3],
      data.pressure[1],
      data.pressure[2],
      data.pressure[3],
      data.pressure[4],
      // 统计特征 (简单示例)
      Math.max(...sensorDataBuffer.slice(-10).map(d => d.acceleration[3])),
      Math.min(...sensorDataBuffer.slice(-10).map(d => d.acceleration[3])),
      average(sensorDataBuffer.slice(-10).map(d => d.acceleration[1])),
      average(sensorDataBuffer.slice(-10).map(d => d.acceleration[2])),
      average(sensorDataBuffer.slice(-10).map(d => d.acceleration[3])),
      average(sensorDataBuffer.slice(-10).map(d => d.pressure[4])),
    ];

    const strideInput = tf.tensor2d([strideFeatures]);

    // 运行模型推理
    const gaitOutput = models.gaitCycle.predict(gaitInput) as tf.Tensor;
    const abnormalityOutput = models.abnormalityDetection.predict(abnormalityInput) as tf.Tensor;
    const strideOutput = models.strideAnalysis.predict(strideInput) as tf.Tensor;

    // 解析模型输出
    const gaitPhaseIndex = await tf.argMax(gaitOutput, 1).dataSync()[0];
    const abnormalityProbs = await abnormalityOutput.dataSync();
    const strideMetrics = await strideOutput.dataSync();

    // 映射步态周期
    const gaitPhaseMap: GaitPhase[] = [
      GaitPhase.INITIAL_CONTACT,
      GaitPhase.LOADING_RESPONSE,
      GaitPhase.MID_STANCE,
      GaitPhase.TERMINAL_STANCE,
      GaitPhase.PRE_SWING,
      GaitPhase.INITIAL_SWING,
      GaitPhase.MID_SWING,
      GaitPhase.TERMINAL_SWING
    ];

    const gaitPhase = gaitPhaseMap[gaitPhaseIndex] || GaitPhase.MID_STANCE;

    // 检测异常 (大于阈值0.7的视为异常)
    const abnormalities: GaitAbnormality[] = [];
    const abnormalityMap: GaitAbnormality[] = [
      GaitAbnormality.OVERPRONATION,
      GaitAbnormality.OVERSUPINATION,
      GaitAbnormality.VERTICAL_OSCILLATION,
      GaitAbnormality.CADENCE_IRREGULARITY,
      GaitAbnormality.TRUNK_LEAN,
      GaitAbnormality.OVERSTRIDING,
      GaitAbnormality.ARM_SWING,
      GaitAbnormality.CROSSOVER_GAIT,
      GaitAbnormality.KNEE_COLLAPSE
    ];

    for (let i = 0; i < abnormalityProbs.length; i++) {
      if (abnormalityProbs[i] > 0.7) {
        abnormalities.push(abnormalityMap[i]);
      }
    }

    // 计算步幅指标
    const metrics = {
      cadence: data.cadence,
      strideLength: data.strideLength,
      contactTime: strideMetrics[0],
      flightTime: strideMetrics[1],
      verticalOscillation: strideMetrics[2],
      impactForce: strideMetrics[3],
      pronationAngle: strideMetrics[4]
    };

    // 计算评分
    const efficiency = strideMetrics[5] * 100; // 假设模型输出为0-1
    const stability = strideMetrics[6] * 100;  // 假设模型输出为0-1
    const impact = 85; // 缺少此指标，使用默认值

    const scores = {
      efficiency,
      stability,
      impact,
      overall: (efficiency * 0.4 + stability * 0.35 + impact * 0.25)
    };

    // 释放张量资源
    tf.dispose([gaitInput, abnormalityInput, strideInput, gaitOutput, abnormalityOutput, strideOutput]);

    return {
      gaitPhase,
      footStrikePattern: determineFootStrikePattern(data),
      abnormalities,
      metrics,
      scores,
      confidence: 0.85
    };
  } catch (error) {
    console.error('[Engine] TensorFlow预测失败:', error);
    return {};
  }
}

/**
 * 创建默认分析结果
 */
function createDefaultAnalysis(data: SensorData): AnalysisResult {
  return {
    gaitPhase: GaitPhase.MID_STANCE,
    footStrikePattern: determineFootStrikePattern(data),
    abnormalities: [],
    metrics: {
      cadence: data.cadence,
      strideLength: data.strideLength,
      contactTime: 250, // 默认值
      flightTime: 400,  // 默认值
      verticalOscillation: 5.0, // 默认值
      impactForce: 2.0,  // 默认值
      pronationAngle: 8.0 // 默认值
    },
    scores: {
      efficiency: 75,
      stability: 75,
      impact: 75,
      overall: 75
    },
    confidence: 0.6 // 低置信度
  };
}

/**
 * 判断足部着地方式
 */
function determineFootStrikePattern(data: SensorData): FootStrikePattern {
  const frontPressure = data.pressure[1];
  const midPressure = data.pressure[2];
  const rearPressure = data.pressure[3];

  if (frontPressure > midPressure && frontPressure > rearPressure) {
    return FootStrikePattern.FOREFOOT;
  } else if (rearPressure > frontPressure && rearPressure > midPressure) {
    return FootStrikePattern.REARFOOT;
  } else {
    return FootStrikePattern.MIDFOOT;
  }
}

/**
 * 获取引擎状态
 */
export function getEngineStatus(): {
  initialized: boolean;
  running: boolean;
  modelStatus: ModelStatus;
  dataBufferSize: number;
} {
  return {
    initialized: engineInitialized,
    running: engineRunning,
    modelStatus: isModelReady() ? ModelStatus.READY : ModelStatus.LOADING,
    dataBufferSize: sensorDataBuffer.length
  };
}

/**
 * 启动AI引擎
 */
export function startEngine(): void {
  if (!engineInitialized) {
    throw new Error('AI引擎尚未初始化');
  }

  if (engineRunning) {
    return; // 已经在运行，无需重复启动
  }

  engineRunning = true;

  if (config.debugMode) {
    console.log('[Engine] AI引擎已启动');
  }
}

/**
 * 停止AI引擎
 */
export function stopEngine(): void {
  if (!engineRunning) {
    return; // 未运行，无需停止
  }

  engineRunning = false;

  if (config.debugMode) {
    console.log('[Engine] AI引擎已停止');
  }
}

/**
 * 释放引擎资源
 */
export async function disposeEngine(): Promise<void> {
  // 停止引擎
  stopEngine();

  // 释放TensorFlow模型
  if (config.useTensorFlow) {
    await disposeModels();
  }

  // 清空数据缓冲区
  sensorDataBuffer.length = 0;
  lastAnalysisResult = null;

  engineInitialized = false;

  if (config.debugMode) {
    console.log('[Engine] AI引擎资源已释放');
  }
}

/**
 * 工具函数: 计算平均值
 */
function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

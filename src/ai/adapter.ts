/**
 * AI适配器
 * 连接AI引擎和前端界面
 */

import * as AIEngine from './index';
import { SensorData, Suggestion, AnalysisResult, ModelStatus } from './types';

// 引擎状态
let isEngineInitialized = false;
let isEngineRunning = false;

// 最后分析结果和建议
let lastAnalysisResult: AnalysisResult | null = null;
let lastSuggestions: Suggestion[] = [];

// 引擎初始化配置
const engineConfig = {
  useTensorFlow: true,
  useExpertSystem: true,
  usePersonalization: true,
  sensorFrequency: 10,
  debugMode: false
};

// 分析间隔 (毫秒)
const ANALYSIS_INTERVAL = 1000;
let analysisIntervalId: number | null = null;

/**
 * 初始化AI系统
 */
export async function initializeAI(debug = false): Promise<boolean> {
  if (isEngineInitialized) return true;

  try {
    engineConfig.debugMode = debug;

    // 初始化AI引擎
    await AIEngine.initializeAIEngine(engineConfig);
    isEngineInitialized = true;

    console.log('AI引擎初始化成功');
    return true;
  } catch (error) {
    console.error('AI引擎初始化失败:', error);
    return false;
  }
}

/**
 * 开始AI分析
 */
export function startAnalysis(): boolean {
  if (!isEngineInitialized) {
    console.error('AI引擎未初始化');
    return false;
  }

  if (isEngineRunning) return true;

  try {
    // 启动引擎
    AIEngine.startEngine();
    isEngineRunning = true;

    // 设置定期分析
    analysisIntervalId = window.setInterval(async () => {
      try {
        // 进行分析
        const result = await AIEngine.analyze();

        // 更新最新结果
        lastAnalysisResult = result.analysis;
        lastSuggestions = result.suggestions;

        // 触发结果更新事件
        const event = new CustomEvent('ai-analysis-update', {
          detail: {
            analysis: lastAnalysisResult,
            suggestions: lastSuggestions
          }
        });
        window.dispatchEvent(event);
      } catch (error) {
        if ((error as Error).message !== '数据样本不足') {
          console.error('AI分析错误:', error);
        }
      }
    }, ANALYSIS_INTERVAL);

    console.log('AI分析已启动');
    return true;
  } catch (error) {
    console.error('启动AI分析失败:', error);
    return false;
  }
}

/**
 * 停止AI分析
 */
export function stopAnalysis(): boolean {
  if (!isEngineRunning) return true;

  try {
    // 停止引擎
    AIEngine.stopEngine();

    // 清除分析定时器
    if (analysisIntervalId !== null) {
      clearInterval(analysisIntervalId);
      analysisIntervalId = null;
    }

    isEngineRunning = false;
    console.log('AI分析已停止');
    return true;
  } catch (error) {
    console.error('停止AI分析失败:', error);
    return false;
  }
}

/**
 * 释放AI资源
 */
export async function disposeAI(): Promise<boolean> {
  try {
    // 停止分析
    stopAnalysis();

    // 释放引擎资源
    if (isEngineInitialized) {
      await AIEngine.disposeEngine();
      isEngineInitialized = false;
    }

    lastAnalysisResult = null;
    lastSuggestions = [];

    console.log('AI资源已释放');
    return true;
  } catch (error) {
    console.error('释放AI资源失败:', error);
    return false;
  }
}

/**
 * 添加传感器数据
 */
export function addData(data: SensorData): void {
  if (!isEngineInitialized || !isEngineRunning) return;

  try {
    AIEngine.addSensorData(data);
  } catch (error) {
    console.error('添加传感器数据失败:', error);
  }
}

/**
 * 获取AI引擎状态
 */
export function getAIStatus(): {
  initialized: boolean;
  running: boolean;
  modelStatus: ModelStatus;
  dataCount: number;
} {
  if (!isEngineInitialized) {
    return {
      initialized: false,
      running: false,
      modelStatus: AIEngine.ModelStatus.INACTIVE,
      dataCount: 0
    };
  }

  const status = AIEngine.getEngineStatus();

  return {
    initialized: status.initialized,
    running: status.running,
    modelStatus: status.modelStatus,
    dataCount: status.dataBufferSize
  };
}

/**
 * 获取最后分析结果
 */
export function getLastAnalysisResult(): AnalysisResult | null {
  return lastAnalysisResult;
}

/**
 * 获取最后建议
 */
export function getLastSuggestions(): Suggestion[] {
  return [...lastSuggestions];
}

/**
 * 获取AI引擎支持的功能
 */
export function getSupportedFeatures() {
  return { ...AIEngine.SUPPORTED_FEATURES };
}

/**
 * 转换服务器数据为AI引擎所需的格式
 */
export function convertServerDataToSensorData(serverData: any): SensorData {
  return {
    timestamp: serverData.timestamp,
    acceleration: serverData.acceleration,
    pressure: serverData.pressure,
    cadence: serverData.cadence,
    strideLength: serverData.strideLength
  };
}

/**
 * 注册AI分析结果更新回调
 */
export function onAnalysisUpdate(callback: (result: { analysis: AnalysisResult, suggestions: Suggestion[] }) => void): () => void {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<{ analysis: AnalysisResult, suggestions: Suggestion[] }>;
    callback(customEvent.detail);
  };

  window.addEventListener('ai-analysis-update', handler);

  // 返回取消注册函数
  return () => {
    window.removeEventListener('ai-analysis-update', handler);
  };
}

/**
 * 获取AI模块版本
 */
export function getAIVersion(): string {
  return AIEngine.AI_MODULE_VERSION;
}

/**
 * 获取AI引擎描述
 */
export function getAIDescription(): string {
  return AIEngine.getAIEngineDescription();
}

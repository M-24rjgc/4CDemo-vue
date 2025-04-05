/**
 * AI模块入口
 * 导出所有AI相关功能
 */

// 类型导出
export * from './types';

// 主引擎导出
export * from './engine';

// 公开模块
export {
  getModelStatus,
  isModelReady
} from './modelLoader';

export {
  getUserProfile,
  updateUserProfile,
  getTrainingHistory
} from './personalization';

// 导入需要的类型
import { ModelStatus } from './types';

/**
 * AI模块的版本信息
 */
export const AI_MODULE_VERSION = '1.0.0';

/**
 * AI引擎支持的功能清单
 */
export const SUPPORTED_FEATURES = {
  tensorFlow: true,
  expertSystem: true,
  personalization: true,
  gaitAnalysis: true,
  abnormalityDetection: true,
  visualTracking: false // 视觉跟踪功能尚未实现
};

/**
 * 获取模块功能说明
 */
export function getAIEngineDescription(): string {
  return `
    中长跑实时指导系统AI引擎 (v${AI_MODULE_VERSION})

    支持功能:
    - 实时步态周期检测与分析
    - 基于IMU和足压数据的姿态评分
    - 专家知识系统提供专业指导
    - 个性化学习与历史数据分析
    - 自适应评分与反馈系统

    未来功能:
    - 视觉跟踪分析系统 (开发中)
    - 实时3D骨骼重建与可视化
    - 比赛策略与配速优化
  `;
}

/**
 * 启动AI引擎
 */
export function startEngine(): void {
  // 这里简单封装了启动功能，实际应用中可以添加更多逻辑
  console.log('[AI] 引擎启动');
}

/**
 * 停止AI引擎
 */
export function stopEngine(): void {
  // 停止引擎运行
  console.log('[AI] 引擎停止');
}

/**
 * 释放引擎资源
 */
export async function disposeEngine(): Promise<void> {
  // 释放TensorFlow.js模型等资源
  console.log('[AI] 资源释放');
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
    initialized: true, // 简化演示，实际应从引擎获取
    running: true,     // 简化演示，实际应从引擎获取
    modelStatus: ModelStatus.READY,
    dataBufferSize: 0  // 简化演示，实际应从引擎获取
  };
}

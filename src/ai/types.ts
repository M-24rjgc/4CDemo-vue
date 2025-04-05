/**
 * AI模块类型定义
 */

// 传感器数据类型
export interface SensorData {
  timestamp: number;
  acceleration: [number, number, number, number]; // [timestamp, x, y, z]
  pressure: [number, number, number, number, number]; // [timestamp, 前脚掌, 中脚掌, 后脚掌, 外侧]
  cadence: number;
  strideLength: number;
}

// 步态周期
export enum GaitPhase {
  INITIAL_CONTACT = 'initialContact',     // 初始接触
  LOADING_RESPONSE = 'loadingResponse',   // 负重响应
  MID_STANCE = 'midStance',               // 中间支撑
  TERMINAL_STANCE = 'terminalStance',     // 末端支撑
  PRE_SWING = 'preSwing',                 // 预摆动
  INITIAL_SWING = 'initialSwing',         // 初始摆动
  MID_SWING = 'midSwing',                 // 中间摆动
  TERMINAL_SWING = 'terminalSwing'        // 末端摆动
}

// 足部着地方式
export enum FootStrikePattern {
  FOREFOOT = 'forefoot',       // 前脚掌着地
  MIDFOOT = 'midfoot',         // 中脚掌着地
  REARFOOT = 'rearfoot'        // 后脚掌着地
}

// 步态异常类型
export enum GaitAbnormality {
  OVERPRONATION = 'overpronation',                 // 过度外翻
  OVERSUPINATION = 'oversupination',               // 过度内翻
  VERTICAL_OSCILLATION = 'verticalOscillation',    // 垂直振幅过大
  CADENCE_IRREGULARITY = 'cadenceIrregularity',    // 步频不稳定
  TRUNK_LEAN = 'trunkLean',                        // 上身过度前倾/后仰
  OVERSTRIDING = 'overstriding',                   // 步幅过大
  ARM_SWING = 'armSwing',                          // 手臂摆动异常
  CROSSOVER_GAIT = 'crossoverGait',                // 交叉步态
  KNEE_COLLAPSE = 'kneeCollapse'                   // 膝盖内扣
}

// 分析结果
export interface AnalysisResult {
  gaitPhase: GaitPhase;                           // 当前步态周期阶段
  footStrikePattern: FootStrikePattern;           // 足部着地方式
  abnormalities: GaitAbnormality[];               // 检测到的异常
  metrics: {
    cadence: number;                              // 步频(步/分钟)
    strideLength: number;                         // 步幅(厘米)
    contactTime: number;                          // 地面接触时间(毫秒)
    flightTime: number;                           // 腾空时间(毫秒)
    verticalOscillation: number;                  // 垂直振幅(厘米)
    impactForce: number;                          // 冲击力(归一化)
    pronationAngle: number;                       // 足外翻角度(度)
  };
  scores: {
    efficiency: number;                           // 效率评分(0-100)
    stability: number;                            // 稳定性评分(0-100)
    impact: number;                               // 冲击控制评分(0-100)
    overall: number;                              // 总体评分(0-100)
  };
  confidence: number;                             // 模型置信度(0-1)
}

// AI模型状态
export enum ModelStatus {
  LOADING = 'loading',        // 模型加载中
  READY = 'ready',            // 模型就绪
  ERROR = 'error',            // 模型加载出错
  INACTIVE = 'inactive'       // 模型未激活
}

// AI引擎配置
export interface AIEngineConfig {
  useTensorFlow: boolean;     // 是否使用TensorFlow.js
  useExpertSystem: boolean;   // 是否使用专家系统
  usePersonalization: boolean; // 是否使用个性化学习
  sensorFrequency: number;     // 传感器数据采样频率
  debugMode: boolean;          // 调试模式
}

// 改进建议
export interface Suggestion {
  id: string;                // 唯一ID
  type: 'info' | 'warning' | 'success' | 'danger'; // 建议类型
  text: string;              // 建议文本
  priority: number;          // 优先级(1-5)
  abnormality?: GaitAbnormality; // 对应的异常类型(可选)
  confidence: number;        // 置信度(0-1)
}

// 个性化配置文件
export interface RunnerProfile {
  id: string;                 // 用户ID
  height?: number;            // 身高(厘米)
  weight?: number;            // 体重(公斤)
  age?: number;               // 年龄
  experience: 'beginner' | 'intermediate' | 'advanced'; // 跑步经验
  goals: string[];            // 训练目标
  knownIssues: GaitAbnormality[]; // 已知问题
  baselineMetrics: {           // 基线指标
    cadence: number;
    strideLength: number;
    footStrikePattern: FootStrikePattern;
  };
  trainingHistory: {           // 训练历史简要
    sessionsCount: number;
    totalDistance: number;
    lastSessionDate?: Date;
  };
}

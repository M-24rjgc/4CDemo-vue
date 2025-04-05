/**
 * 专家系统模块
 * 基于运动生物力学规则提供分析和建议
 */

import {
  GaitPhase,
  FootStrikePattern,
  GaitAbnormality,
  SensorData,
  AnalysisResult,
  Suggestion
} from './types';
import { v4 as uuidv4 } from 'uuid';

// 调试模式
let debugMode = false;

// 规则库
interface Rule {
  id: string;
  name: string;
  description: string;
  condition: (data: SensorData, context: AnalysisContext) => boolean;
  consequence: (data: SensorData, context: AnalysisContext) => void | Suggestion;
  priority: number;
}

// 分析上下文
interface AnalysisContext {
  history: SensorData[];
  currentPhase: GaitPhase;
  footStrikePattern: FootStrikePattern;
  abnormalities: GaitAbnormality[];
  // 临时计算值
  temp: {
    [key: string]: any;
  };
}

// 初始化专家系统
export function initExpertSystem(debug = false): void {
  debugMode = debug;

  if (debugMode) {
    console.log('[Expert] 专家系统初始化');
  }

  // 加载规则库
  loadRules();

  if (debugMode) {
    console.log(`[Expert] 已加载${rules.length}条规则`);
  }
}

// 规则库
const rules: Rule[] = [];

/**
 * 加载规则库
 */
function loadRules(): void {
  // 步态周期检测规则
  rules.push({
    id: 'gait-cycle-1',
    name: '初始接触检测',
    description: '检测脚跟着地时刻',
    condition: (data, context) => {
      // 上一个样本为空中，当前样本压力增加表示着地
      const prevSample = context.history[context.history.length - 2];
      if (!prevSample) return false;

      const prevPressure = prevSample.pressure[1] + prevSample.pressure[2] + prevSample.pressure[3];
      const currPressure = data.pressure[1] + data.pressure[2] + data.pressure[3];

      return prevPressure < 1.0 && currPressure > 1.5;
    },
    consequence: (data, context) => {
      context.currentPhase = GaitPhase.INITIAL_CONTACT;
    },
    priority: 10
  });

  rules.push({
    id: 'gait-cycle-2',
    name: '负重响应检测',
    description: '检测体重从后脚掌转移到中脚掌的过程',
    condition: (data, context) => {
      return context.currentPhase === GaitPhase.INITIAL_CONTACT &&
             data.pressure[2] > data.pressure[3] && // 中脚掌压力大于后脚掌
             data.pressure[2] > data.pressure[1];   // 中脚掌压力大于前脚掌
    },
    consequence: (data, context) => {
      context.currentPhase = GaitPhase.LOADING_RESPONSE;
    },
    priority: 10
  });

  // 足部着地方式检测规则
  rules.push({
    id: 'foot-strike-1',
    name: '前脚掌着地检测',
    description: '检测前脚掌优先着地的模式',
    condition: (data, context) => {
      return context.currentPhase === GaitPhase.INITIAL_CONTACT &&
             data.pressure[1] > data.pressure[2] * 1.5 && // 前脚掌压力远大于中脚掌
             data.pressure[1] > data.pressure[3] * 2.0;   // 前脚掌压力远大于后脚掌
    },
    consequence: (data, context) => {
      context.footStrikePattern = FootStrikePattern.FOREFOOT;
    },
    priority: 9
  });

  rules.push({
    id: 'foot-strike-2',
    name: '中脚掌着地检测',
    description: '检测中脚掌优先着地的模式',
    condition: (data, context) => {
      return context.currentPhase === GaitPhase.INITIAL_CONTACT &&
             data.pressure[2] > data.pressure[1] * 0.7 && // 中脚掌压力接近或大于前脚掌
             data.pressure[2] > data.pressure[3] * 0.7;   // 中脚掌压力接近或大于后脚掌
    },
    consequence: (data, context) => {
      context.footStrikePattern = FootStrikePattern.MIDFOOT;
    },
    priority: 9
  });

  rules.push({
    id: 'foot-strike-3',
    name: '后脚掌着地检测',
    description: '检测后脚掌优先着地的模式',
    condition: (data, context) => {
      return context.currentPhase === GaitPhase.INITIAL_CONTACT &&
             data.pressure[3] > data.pressure[1] * 1.5 && // 后脚掌压力远大于前脚掌
             data.pressure[3] > data.pressure[2] * 1.2;   // 后脚掌压力大于中脚掌
    },
    consequence: (data, context) => {
      context.footStrikePattern = FootStrikePattern.REARFOOT;
    },
    priority: 9
  });

  // 步态异常检测规则
  rules.push({
    id: 'abnormality-1',
    name: '过度外翻检测',
    description: '检测足部外侧过度受力',
    condition: (data, context) => {
      // 计算外侧压力比例
      const totalPressure = data.pressure[1] + data.pressure[2] + data.pressure[3] + data.pressure[4];
      const lateralRatio = data.pressure[4] / totalPressure;

      return lateralRatio > 0.35; // 外侧压力超过总压力的35%
    },
    consequence: (data, context) => {
      if (!context.abnormalities.includes(GaitAbnormality.OVERPRONATION)) {
        context.abnormalities.push(GaitAbnormality.OVERPRONATION);
      }

      return {
        id: uuidv4(),
        type: 'warning',
        text: '检测到足部过度外翻，建议调整足部着地姿势并考虑使用合适的跑鞋',
        priority: 4,
        abnormality: GaitAbnormality.OVERPRONATION,
        confidence: 0.85
      };
    },
    priority: 8
  });

  rules.push({
    id: 'abnormality-2',
    name: '步频异常检测',
    description: '检测步频是否在理想范围内',
    condition: (data, context) => {
      return data.cadence < 165 || data.cadence > 190;
    },
    consequence: (data, context) => {
      if (!context.abnormalities.includes(GaitAbnormality.CADENCE_IRREGULARITY)) {
        context.abnormalities.push(GaitAbnormality.CADENCE_IRREGULARITY);
      }

      const suggestion: Suggestion = {
        id: uuidv4(),
        type: 'info',
        priority: 3,
        abnormality: GaitAbnormality.CADENCE_IRREGULARITY,
        confidence: 0.9,
        text: ''
      };

      if (data.cadence < 165) {
        suggestion.text = '步频偏低，建议提高步频至175-185步/分钟以减小冲击力';
      } else {
        suggestion.text = '步频偏高，可能会增加能量消耗，尝试稍微降低步频并增加步幅';
      }

      return suggestion;
    },
    priority: 7
  });

  rules.push({
    id: 'abnormality-3',
    name: '垂直振幅过大检测',
    description: '检测身体上下波动是否过大',
    condition: (data, context) => {
      // 垂直方向加速度变化过大
      const prevSamples = context.history.slice(-5);
      if (prevSamples.length < 5) return false;

      let maxVertAccel = -Infinity;
      let minVertAccel = Infinity;

      for (const sample of prevSamples) {
        const vertAccel = sample.acceleration[3]; // z轴加速度
        maxVertAccel = Math.max(maxVertAccel, vertAccel);
        minVertAccel = Math.min(minVertAccel, vertAccel);
      }

      const vertRange = maxVertAccel - minVertAccel;
      return vertRange > 2.5; // 加速度范围过大
    },
    consequence: (data, context) => {
      if (!context.abnormalities.includes(GaitAbnormality.VERTICAL_OSCILLATION)) {
        context.abnormalities.push(GaitAbnormality.VERTICAL_OSCILLATION);
      }

      return {
        id: uuidv4(),
        type: 'warning',
        text: '垂直振幅过大，尝试减小上下跳动以提高能量效率',
        priority: 3,
        abnormality: GaitAbnormality.VERTICAL_OSCILLATION,
        confidence: 0.8
      };
    },
    priority: 6
  });

  // 添加更多规则...
}

/**
 * 使用专家系统分析传感器数据
 */
export function analyzeWithExpertSystem(
  data: SensorData,
  history: SensorData[],
  previousAnalysis?: AnalysisResult
): { updatedAnalysis: AnalysisResult, suggestions: Suggestion[] } {
  // 初始化分析上下文
  const context: AnalysisContext = {
    history: [...history, data],
    currentPhase: previousAnalysis?.gaitPhase || GaitPhase.MID_STANCE, // 默认中间支撑相
    footStrikePattern: previousAnalysis?.footStrikePattern || FootStrikePattern.MIDFOOT, // 默认中脚掌着地
    abnormalities: previousAnalysis?.abnormalities || [],
    temp: {}
  };

  // 收集建议
  const suggestions: Suggestion[] = [];

  // 排序规则（按优先级）
  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

  // 执行规则
  for (const rule of sortedRules) {
    try {
      if (rule.condition(data, context)) {
        if (debugMode) {
          console.log(`[Expert] 规则触发: ${rule.name}`);
        }

        const result = rule.consequence(data, context);
        if (result && 'text' in result) {
          suggestions.push(result);
        }
      }
    } catch (error) {
      console.error(`[Expert] 规则执行错误 (${rule.id}):`, error);
    }
  }

  // 创建分析结果
  const result: AnalysisResult = {
    gaitPhase: context.currentPhase,
    footStrikePattern: context.footStrikePattern,
    abnormalities: [...context.abnormalities],
    metrics: calculateMetrics(data, context),
    scores: calculateScores(data, context),
    confidence: 0.88  // 专家系统的置信度
  };

  // 按优先级排序建议
  suggestions.sort((a, b) => b.priority - a.priority);

  return {
    updatedAnalysis: result,
    suggestions: suggestions
  };
}

/**
 * 计算跑步指标
 */
function calculateMetrics(data: SensorData, context: AnalysisContext) {
  // 在实际应用中，这里会有更复杂的计算
  // 目前使用模拟数据

  // 加速度数据的标准差可以用来估计垂直振幅
  const vertOscillation = calculateVerticalOscillation(context.history);

  // 使用步频和预估的步幅计算接触时间和腾空时间
  const cadence = data.cadence;
  const strideLength = data.strideLength;

  // 每步时间(秒)
  const stepTime = 60 / cadence;

  // 根据经验公式，接触时间约占步态周期的40%
  const contactTime = stepTime * 0.4 * 1000; // 转为毫秒

  // 腾空时间 = 总时间 - 接触时间
  const flightTime = stepTime * 0.6 * 1000; // 转为毫秒

  // 使用足底压力估算冲击力
  const totalPressure = data.pressure[1] + data.pressure[2] + data.pressure[3];
  const impactForce = totalPressure * 1.2;

  // 计算足外翻角度(模拟)
  const lateralPressure = data.pressure[4];
  const pronationAngle = Math.min(15, Math.max(0, lateralPressure * 10));

  return {
    cadence: cadence,
    strideLength: strideLength,
    contactTime: contactTime,
    flightTime: flightTime,
    verticalOscillation: vertOscillation,
    impactForce: impactForce,
    pronationAngle: pronationAngle
  };
}

/**
 * 计算跑步评分
 */
function calculateScores(data: SensorData, context: AnalysisContext) {
  // 效率评分
  const efficiencyFactors = [
    // 步频在理想范围得高分
    clamp((data.cadence >= 170 && data.cadence <= 185)
          ? 100
          : 100 - Math.abs(175 - data.cadence) * 2, 0, 100),

    // 垂直振幅小得高分
    clamp(100 - calculateVerticalOscillation(context.history) * 10, 0, 100),

    // 中足着地效率高
    context.footStrikePattern === FootStrikePattern.MIDFOOT ? 100 :
    context.footStrikePattern === FootStrikePattern.FOREFOOT ? 90 : 70
  ];

  // 稳定性评分
  const stabilityFactors = [
    // 足部外翻程度影响稳定性
    clamp(100 - (context.abnormalities.includes(GaitAbnormality.OVERPRONATION) ? 30 : 0), 0, 100),

    // 步频稳定性
    clamp(100 - (context.abnormalities.includes(GaitAbnormality.CADENCE_IRREGULARITY) ? 25 : 0), 0, 100),

    // 压力分布
    isPressureDistributionBalanced(data) ? 100 : 75
  ];

  // 冲击控制评分
  const impactFactors = [
    // 前脚掌着地冲击小
    context.footStrikePattern === FootStrikePattern.FOREFOOT ? 100 :
    context.footStrikePattern === FootStrikePattern.MIDFOOT ? 90 : 70,

    // 步频高冲击小
    clamp(60 + data.cadence / 4, 0, 100),

    // 垂直振幅大冲击大
    clamp(100 - calculateVerticalOscillation(context.history) * 12, 0, 100)
  ];

  // 计算平均分
  const efficiencyScore = Math.round(average(efficiencyFactors));
  const stabilityScore = Math.round(average(stabilityFactors));
  const impactScore = Math.round(average(impactFactors));

  // 综合评分
  const overallScore = Math.round(
    efficiencyScore * 0.4 + stabilityScore * 0.35 + impactScore * 0.25
  );

  return {
    efficiency: efficiencyScore,
    stability: stabilityScore,
    impact: impactScore,
    overall: overallScore
  };
}

/**
 * 计算垂直振幅
 */
function calculateVerticalOscillation(history: SensorData[]): number {
  if (history.length < 5) return 5.0; // 默认值

  // 取最近的几个样本
  const recentSamples = history.slice(-10);

  // 提取垂直加速度(z轴)
  const verticalAccels = recentSamples.map(sample => sample.acceleration[3]);

  // 计算最大值、最小值的差作为振幅估计
  const max = Math.max(...verticalAccels);
  const min = Math.min(...verticalAccels);
  const range = max - min;

  // 转换为厘米 (简化的计算)
  return range * 2.5;
}

/**
 * 判断足底压力分布是否平衡
 */
function isPressureDistributionBalanced(data: SensorData): boolean {
  const frontPressure = data.pressure[1];
  const midPressure = data.pressure[2];
  const rearPressure = data.pressure[3];
  const lateralPressure = data.pressure[4];

  // 横向平衡: 外侧压力不应过大
  const lateralRatio = lateralPressure / (frontPressure + midPressure + rearPressure);
  if (lateralRatio > 0.3) return false;

  // 纵向平衡: 前后压力比例合理
  const totalLongitudinal = frontPressure + midPressure + rearPressure;
  const frontRatio = frontPressure / totalLongitudinal;
  const midRatio = midPressure / totalLongitudinal;
  const rearRatio = rearPressure / totalLongitudinal;

  // 理想分布: 前40%，中30%，后30%
  const frontDiff = Math.abs(frontRatio - 0.4);
  const midDiff = Math.abs(midRatio - 0.3);
  const rearDiff = Math.abs(rearRatio - 0.3);

  // 偏差总和不应过大
  return (frontDiff + midDiff + rearDiff) < 0.25;
}

/**
 * 工具函数: 数组平均值
 */
function average(values: number[]): number {
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * 工具函数: 限制数值在指定范围内
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

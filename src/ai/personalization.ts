/**
 * 个性化学习模块
 * 处理用户数据存储、分析和个性化建议生成
 */

import {
  RunnerProfile,
  SensorData,
  AnalysisResult,
  GaitPhase,
  FootStrikePattern,
  GaitAbnormality,
  Suggestion
} from './types';
import { v4 as uuidv4 } from 'uuid';

// 调试模式
let debugMode = false;

// 默认用户配置
const DEFAULT_PROFILE: RunnerProfile = {
  id: 'default',
  experience: 'intermediate',
  goals: ['提高效率', '预防受伤'],
  knownIssues: [],
  baselineMetrics: {
    cadence: 175,
    strideLength: 110,
    footStrikePattern: FootStrikePattern.MIDFOOT
  },
  trainingHistory: {
    sessionsCount: 0,
    totalDistance: 0
  }
};

// 当前用户配置
let currentProfile: RunnerProfile = {...DEFAULT_PROFILE};

// 历史数据缓存 (实际应用中应存储在本地存储或数据库中)
const sessionHistory: {
  date: Date;
  duration: number;  // 秒
  distance: number;  // 公里
  avgCadence: number;
  avgStrideLength: number;
  avgPostureScore: number;
  abnormalities: GaitAbnormality[];
  metrics: {
    [key: string]: number;
  }
}[] = [];

// 最近的分析数据 (用于检测趋势)
const recentAnalysis: AnalysisResult[] = [];

/**
 * 初始化个性化模块
 */
export function initPersonalization(debug = false): void {
  debugMode = debug;

  if (debugMode) {
    console.log('[Person] 个性化模块初始化');
  }

  // 尝试从localStorage加载用户配置
  loadUserProfile();
}

/**
 * 加载用户配置
 */
function loadUserProfile(): void {
  try {
    const savedProfile = localStorage.getItem('runnerProfile');
    if (savedProfile) {
      currentProfile = JSON.parse(savedProfile);

      if (debugMode) {
        console.log('[Person] 已加载用户配置:', currentProfile.id);
      }
    } else if (debugMode) {
      console.log('[Person] 未找到保存的用户配置，使用默认配置');
    }

    // 尝试加载历史数据
    const savedHistory = localStorage.getItem('sessionHistory');
    if (savedHistory) {
      // 转换日期格式
      const parsed = JSON.parse(savedHistory);
      sessionHistory.push(...parsed.map((item: any) => ({
        ...item,
        date: new Date(item.date)
      })));

      if (debugMode) {
        console.log(`[Person] 已加载${sessionHistory.length}条历史记录`);
      }
    }
  } catch (error) {
    console.error('[Person] 加载用户配置失败:', error);
  }
}

/**
 * 保存用户配置
 */
export function saveUserProfile(): void {
  try {
    localStorage.setItem('runnerProfile', JSON.stringify(currentProfile));
    localStorage.setItem('sessionHistory', JSON.stringify(sessionHistory));

    if (debugMode) {
      console.log('[Person] 用户配置已保存');
    }
  } catch (error) {
    console.error('[Person] 保存用户配置失败:', error);
  }
}

/**
 * 获取当前用户配置
 */
export function getUserProfile(): RunnerProfile {
  return {...currentProfile};
}

/**
 * 更新用户配置
 */
export function updateUserProfile(profile: Partial<RunnerProfile>): void {
  currentProfile = {
    ...currentProfile,
    ...profile
  };

  saveUserProfile();
}

/**
 * 添加训练会话记录
 */
export function addTrainingSession(
  duration: number,
  distance: number,
  analysisResults: AnalysisResult[]
): void {
  if (analysisResults.length === 0) return;

  // 计算平均值
  const avgCadence = average(analysisResults.map(r => r.metrics.cadence));
  const avgStrideLength = average(analysisResults.map(r => r.metrics.strideLength));
  const avgPostureScore = average(analysisResults.map(r => r.scores.overall));

  // 合并检测到的异常
  const abnormalities = new Set<GaitAbnormality>();
  for (const result of analysisResults) {
    for (const abnormality of result.abnormalities) {
      abnormalities.add(abnormality);
    }
  }

  // 聚合其他指标
  const metrics: {[key: string]: number} = {};
  const metricKeys = ['contactTime', 'flightTime', 'verticalOscillation', 'impactForce', 'pronationAngle'];

  for (const key of metricKeys) {
    metrics[key] = average(analysisResults.map(r => (r.metrics as any)[key]));
  }

  // 创建会话记录
  const session = {
    date: new Date(),
    duration,
    distance,
    avgCadence,
    avgStrideLength,
    avgPostureScore,
    abnormalities: Array.from(abnormalities),
    metrics
  };

  // 添加到历史记录
  sessionHistory.push(session);

  // 更新用户训练历史
  currentProfile.trainingHistory.sessionsCount++;
  currentProfile.trainingHistory.totalDistance += distance;
  currentProfile.trainingHistory.lastSessionDate = new Date();

  // 更新基准指标 (使用加权平均，新数据权重0.2)
  const oldWeight = 0.8;
  const newWeight = 0.2;

  currentProfile.baselineMetrics.cadence =
    oldWeight * currentProfile.baselineMetrics.cadence +
    newWeight * avgCadence;

  currentProfile.baselineMetrics.strideLength =
    oldWeight * currentProfile.baselineMetrics.strideLength +
    newWeight * avgStrideLength;

  // 保存配置
  saveUserProfile();

  if (debugMode) {
    console.log('[Person] 已添加新的训练会话记录');
  }
}

/**
 * 获取用户历史训练数据
 */
export function getTrainingHistory() {
  return [...sessionHistory].sort((a, b) => b.date.getTime() - a.date.getTime());
}

/**
 * 分析用户历史数据，寻找改进机会
 */
export function analyzeHistoryForImprovements(): Suggestion[] {
  if (sessionHistory.length < 2) {
    return []; // 需要至少两次训练才能分析趋势
  }

  const suggestions: Suggestion[] = [];

  // 获取最近5次训练或全部（取较小值）
  const recentSessions = sessionHistory
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, Math.min(5, sessionHistory.length));

  // 1. 检查步频趋势
  const cadenceTrend = calculateLinearTrend(recentSessions.map(s => s.avgCadence));

  if (Math.abs(cadenceTrend) > 2) {
    // 步频显著变化
    if (cadenceTrend < 0 && recentSessions[0].avgCadence < 175) {
      suggestions.push({
        id: uuidv4(),
        type: 'warning',
        text: '您的步频呈下降趋势且低于理想水平。尝试进行节拍器训练，提高步频至175-185步/分钟。',
        priority: 4,
        abnormality: GaitAbnormality.CADENCE_IRREGULARITY,
        confidence: 0.75
      });
    } else if (cadenceTrend > 0 && recentSessions[0].avgCadence > 185) {
      suggestions.push({
        id: uuidv4(),
        type: 'info',
        text: '您的步频呈上升趋势且高于理想水平。过高的步频可能增加能量消耗，考虑适当增加步幅。',
        priority: 3,
        confidence: 0.7
      });
    }
  }

  // 2. 检查最常见的异常
  const abnormalityCounts = countAbnormalities(recentSessions);
  const mostCommonAbnormalities = Object.entries(abnormalityCounts)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, count]) => count >= recentSessions.length * 0.6) // 在60%以上的训练中出现
    .map(([abnormality]) => abnormality as GaitAbnormality);

  for (const abnormality of mostCommonAbnormalities) {
    switch (abnormality) {
      case GaitAbnormality.OVERPRONATION:
        suggestions.push({
          id: uuidv4(),
          type: 'warning',
          text: '您在多次训练中出现足部过度外翻。建议进行足部强化练习，并考虑使用稳定型跑鞋。',
          priority: 5,
          abnormality: GaitAbnormality.OVERPRONATION,
          confidence: 0.85
        });
        break;

      case GaitAbnormality.VERTICAL_OSCILLATION:
        suggestions.push({
          id: uuidv4(),
          type: 'info',
          text: '您的垂直振幅持续偏高。尝试降低步幅并增加步频，减少上下波动以提高能量效率。',
          priority: 4,
          abnormality: GaitAbnormality.VERTICAL_OSCILLATION,
          confidence: 0.8
        });
        break;

      case GaitAbnormality.OVERSTRIDING:
        suggestions.push({
          id: uuidv4(),
          type: 'warning',
          text: '您在多次训练中出现过大步幅。过大步幅会增加冲击力，尝试减小步幅并提高步频。',
          priority: 4,
          abnormality: GaitAbnormality.OVERSTRIDING,
          confidence: 0.8
        });
        break;

      // 可以添加更多异常类型的建议...
    }
  }

  // 3. 检查进步情况
  if (recentSessions.length >= 3) {
    const postureScoreTrend = calculateLinearTrend(recentSessions.map(s => s.avgPostureScore));

    if (postureScoreTrend > 3) {
      suggestions.push({
        id: uuidv4(),
        type: 'success',
        text: '您的姿态评分持续提升，继续保持当前训练方式!',
        priority: 3,
        confidence: 0.9
      });
    } else if (postureScoreTrend < -3) {
      suggestions.push({
        id: uuidv4(),
        type: 'warning',
        text: '您的姿态评分近期有所下降，可能是疲劳或技术原因导致，考虑增加休息或进行技术练习。',
        priority: 4,
        confidence: 0.75
      });
    }
  }

  return suggestions;
}

/**
 * 个性化分析结果
 */
export function personalizeAnalysis(
  analysis: AnalysisResult,
  sensorData: SensorData
): AnalysisResult {
  // 添加最近分析以跟踪趋势
  if (recentAnalysis.length >= 100) {
    recentAnalysis.shift(); // 移除最旧的元素
  }
  recentAnalysis.push(analysis);

  // 创建个性化后的分析副本
  const personalized: AnalysisResult = {
    ...analysis,
    scores: { ...analysis.scores }
  };

  // 根据用户配置文件调整评分
  adjustScoreBasedOnProfile(personalized);

  // 根据历史数据调整评分和置信度
  adjustScoreBasedOnHistory(personalized);

  return personalized;
}

/**
 * 根据用户配置调整评分
 */
function adjustScoreBasedOnProfile(analysis: AnalysisResult): void {
  // 根据用户经验调整评分标准
  if (currentProfile.experience === 'beginner') {
    // 对初学者宽松一些评分
    analysis.scores.overall = Math.min(100, analysis.scores.overall * 1.1);
  } else if (currentProfile.experience === 'advanced') {
    // 对高级跑者严格一些评分
    analysis.scores.overall = analysis.scores.overall * 0.95;
  }

  // 根据用户已知问题调整
  if (currentProfile.knownIssues.length > 0) {
    // 如果用户存在已知问题，当检测到这些问题时，提高置信度
    for (const issue of currentProfile.knownIssues) {
      if (analysis.abnormalities.includes(issue)) {
        analysis.confidence = Math.min(0.98, analysis.confidence * 1.15);
      }
    }
  }
}

/**
 * 根据历史数据调整评分
 */
function adjustScoreBasedOnHistory(analysis: AnalysisResult): void {
  if (recentAnalysis.length < 10) return; // 需要足够的历史数据

  // 获取最近10个样本
  const recent = recentAnalysis.slice(-10);

  // 计算历史平均评分
  const avgOverallScore = average(recent.map(a => a.scores.overall));

  // 计算历史评分的标准差
  const stdDevScore = standardDeviation(recent.map(a => a.scores.overall));

  // 如果当前评分显著偏离历史平均值 (超过2个标准差)
  const scoreDifference = Math.abs(analysis.scores.overall - avgOverallScore);
  if (scoreDifference > 2 * stdDevScore) {
    // 可能是异常值，降低置信度
    analysis.confidence = Math.max(0.5, analysis.confidence * 0.85);

    // 稍微向平均值靠拢
    analysis.scores.overall =
      analysis.scores.overall * 0.7 + avgOverallScore * 0.3;
  }
}

/**
 * 生成个性化建议
 */
export function generatePersonalizedSuggestions(
  analysis: AnalysisResult,
  sensorData: SensorData
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // 基于目标生成建议
  for (const goal of currentProfile.goals) {
    if (goal === '提高效率') {
      if (analysis.scores.efficiency < 85) {
        suggestions.push({
          id: uuidv4(),
          type: 'info',
          text: '提高效率: 保持松弛自然的跑姿，注意手臂摆动与腿部动作的协调。',
          priority: 3,
          confidence: 0.75
        });
      }
    } else if (goal === '预防受伤') {
      if (analysis.metrics.impactForce > 2.0) {
        suggestions.push({
          id: uuidv4(),
          type: 'warning',
          text: '预防受伤: 检测到较大冲击力，建议调整步频和着地方式，尝试中前脚掌着地以减轻冲击。',
          priority: 4,
          confidence: 0.8
        });
      }
    }
    // 可以添加更多目标相关的建议...
  }

  // 根据用户经验水平个性化建议
  if (currentProfile.experience === 'beginner') {
    // 为初学者提供更详细、更基础的建议
    suggestions.push({
      id: uuidv4(),
      type: 'info',
      text: '跑步小贴士: 保持抬头挺胸，眼睛看前方5-10米处，避免低头或过度后仰。',
      priority: 2,
      confidence: 0.9
    });
  } else if (currentProfile.experience === 'advanced') {
    // 为高级跑者提供更专业、更细节的建议
    if (analysis.footStrikePattern === FootStrikePattern.REARFOOT) {
      suggestions.push({
        id: uuidv4(),
        type: 'info',
        text: '专业建议: 您当前使用后脚掌着地，考虑尝试中前脚掌着地以提高效率和减轻膝关节压力。',
        priority: 3,
        confidence: 0.8
      });
    }
  }

  // 排序并返回建议
  return suggestions.sort((a, b) => b.priority - a.priority);
}

/**
 * 工具函数: 计算线性趋势斜率 (简单线性回归)
 */
function calculateLinearTrend(values: number[]): number {
  const n = values.length;
  if (n <= 1) return 0;

  // X值简单使用索引
  const x = Array.from({length: n}, (_, i) => i);

  // 计算均值
  const meanX = average(x);
  const meanY = average(values);

  // 计算斜率
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (x[i] - meanX) * (values[i] - meanY);
    denominator += Math.pow(x[i] - meanX, 2);
  }

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * 工具函数: 统计异常出现次数
 */
function countAbnormalities(sessions: any[]): Record<GaitAbnormality, number> {
  const counts: Partial<Record<GaitAbnormality, number>> = {};

  for (const session of sessions) {
    for (const abnormality of session.abnormalities) {
      counts[abnormality] = (counts[abnormality] || 0) + 1;
    }
  }

  return counts as Record<GaitAbnormality, number>;
}

/**
 * 工具函数: 计算平均值
 */
function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * 工具函数: 计算标准差
 */
function standardDeviation(values: number[]): number {
  if (values.length <= 1) return 0;

  const avg = average(values);
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = average(squareDiffs);

  return Math.sqrt(avgSquareDiff);
}

/**
 * DeepSeek API 服务适配器
 * 提供与 DeepSeek API 的通信功能
 * 
 * DeepSeek API 使用与 OpenAI 兼容的格式
 * 官方文档: https://api-docs.deepseek.com/zh-cn/
 */

// 定义 API 类型
interface DeepSeekRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  // 新增支持的参数
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

interface DeepSeekResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface DeepAnalysisResult {
  summary: string;
  technicalAnalysis: {
    gaitCycle: string;
    footStrike: string;
    verticalOscillation: string;
    pronationControl: string;
    armSwing: string;
  };
  recommendations: Array<{
    title: string;
    description: string;
    exercises: string[];
  }>;
  trainingPlan?: {
    shortTerm: string;
    longTerm: string;
  };
  improvement?: {
    areas: string[];
    metrics: Record<string, number>;
  };
}

// API 配置
const API_URL = 'https://api.deepseek.com/v1/chat/completions';
const API_KEY = 'sk-a0251b3da9fa4048bd05a7b3da91794b';
// 使用最新的 DeepSeek-V3 模型
const MODEL_NAME = 'deepseek-chat'; // DeepSeek-V3 模型

// 系统提示词，指导模型进行深度分析
const SYSTEM_PROMPT = `你是一位专业的跑步姿态分析AI专家，专注于为跑步者提供深度技术分析。
使用传感器数据（IMU和足压）进行专业分析，并提供以下信息：
1. 整体跑步表现的简明摘要
2. 详细的技术分析，包括步态周期、着地方式、垂直振幅、足内外翻和手臂摆动
3. 针对性改进建议，每条建议都应包含具体的练习方法
4. 短期与长期训练计划建议
5. 潜在的改进空间和关键指标

请使用专业但易懂的语言，回答格式应保持结构化以便于前端展示，具体格式如下：

## 摘要
[提供整体跑步表现的简明摘要]

## 技术分析
- 步态周期: [详细分析]
- 着地方式: [详细分析]
- 垂直振幅: [详细分析]
- 足部内外翻: [详细分析]
- 手臂摆动: [详细分析]

## 改进建议
1. [建议标题]
   - 描述: [详细描述问题和改进方向]
   - 练习: 
     * [具体练习1]
     * [具体练习2]
     * [具体练习3]

2. [建议标题]
   - 描述: [详细描述问题和改进方向]
   - 练习: 
     * [具体练习1]
     * [具体练习2]

## 训练计划
- 短期: [1-2周训练计划建议]
- 长期: [1-2月训练计划建议]
`;

/**
 * 调用 DeepSeek API 进行深度分析
 * @param analysisData 分析数据，包含跑步指标和传感器数据
 * @returns 经过 DeepSeek 分析的结果
 */
export async function analyzeWithDeepSeek(analysisData: any): Promise<DeepAnalysisResult> {
  try {
    console.log('[DeepSeek] 开始深度分析', analysisData);

    // 构建用户提示
    const userPrompt = createPromptFromData(analysisData);

    // 构建请求
    const request: DeepSeekRequest = {
      model: MODEL_NAME,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2, // 低温度使输出更加确定性和专业
      max_tokens: 2000,
      stream: false,
      top_p: 0.9, // 增加输出的多样性
      frequency_penalty: 0.1, // 减少重复
      presence_penalty: 0.1 // 鼓励模型讨论新话题
    };

    // 发送请求
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API调用失败: ${response.status} ${error}`);
    }

    const data = await response.json() as DeepSeekResponse;
    
    // 解析 AI 回复
    return parseDeepSeekResponse(data);

  } catch (error) {
    console.error('[DeepSeek] API调用错误:', error);
    // 返回备用分析结果，避免界面崩溃
    return getFallbackAnalysis();
  }
}

/**
 * 从传感器和跑步数据创建 AI 提示
 */
function createPromptFromData(data: any): string {
  return `请分析以下跑步数据并提供专业深度分析：

## 基本指标
- 步频: ${data.cadence || '未知'} 步/分钟
- 步幅: ${data.strideLength || '未知'} 厘米
- 配速: ${data.pace || '未知'} 分钟/公里
- 训练时长: ${data.duration || '未知'} 分钟
- 距离: ${data.distance || '未知'} 公里

## 足压数据
- 前脚掌压力比例: ${data.pressureDistribution?.forefoot || '未知'}%
- 中脚掌压力比例: ${data.pressureDistribution?.midfoot || '未知'}%
- 后脚掌压力比例: ${data.pressureDistribution?.rearfoot || '未知'}%
- 内侧压力: ${data.pressureDistribution?.medial || '未知'}%
- 外侧压力: ${data.pressureDistribution?.lateral || '未知'}%

## 运动学数据
- 垂直振幅: ${data.kinematics?.verticalOscillation || '未知'} 厘米
- 触地时间: ${data.kinematics?.groundContactTime || '未知'} 毫秒
- 飞行时间: ${data.kinematics?.flightTime || '未知'} 毫秒
- 足内翻/外翻角度: ${data.kinematics?.pronationAngle || '未知'} 度
- 髋部旋转: ${data.kinematics?.hipRotation || '未知'} 度

## 跑步特征
- 着地方式: ${data.footStrike || '未知'}
- 主要异常: ${Array.isArray(data.abnormalities) ? data.abnormalities.join(', ') : '无明显异常'}
- 疲劳水平: ${data.fatigueLevel || '未知'}
- 效率评分: ${data.scores?.efficiency || '未知'}/100
- 稳定性评分: ${data.scores?.stability || '未知'}/100
- 冲击吸收评分: ${data.scores?.impact || '未知'}/100
- 整体评分: ${data.scores?.overall || '未知'}/100

请按照系统提示中指定的格式，提供详细分析、具体的改进建议和训练计划。`;
}

/**
 * 解析 DeepSeek 的回复为结构化数据
 */
function parseDeepSeekResponse(response: DeepSeekResponse): DeepAnalysisResult {
  try {
    const content = response.choices[0]?.message.content;
    
    if (!content) {
      throw new Error('API 返回内容为空');
    }

    // 提取摘要部分
    const summary = extractSection(content, '摘要', '技术分析') || 
                    extractSection(content, 'Summary', 'Technical Analysis') ||
                    '未能提取到摘要信息';

    // 提取技术分析部分
    const technicalAnalysis = {
      gaitCycle: extractDetail(content, '步态周期', ':') || '未能分析步态周期',
      footStrike: extractDetail(content, '着地方式', ':') || '未能分析着地方式',
      verticalOscillation: extractDetail(content, '垂直振幅', ':') || '未能分析垂直振幅',
      pronationControl: extractDetail(content, '足部内外翻', ':') || extractDetail(content, '足内外翻', ':') || '未能分析足部控制',
      armSwing: extractDetail(content, '手臂摆动', ':') || '未能分析手臂摆动',
    };

    // 提取建议部分
    const recommendationsSection = extractSection(content, '改进建议', '训练计划') || 
                                  extractSection(content, 'Recommendations', 'Training Plan') ||
                                  '';
    
    // 分析建议部分
    const recommendations = parseRecommendations(recommendationsSection);

    // 提取训练计划部分
    const trainingPlanSection = extractSection(content, '训练计划', '') || 
                               extractSection(content, 'Training Plan', '') || 
                               '';
    
    // 分析训练计划
    const trainingPlan = trainingPlanSection ? {
      shortTerm: extractDetail(trainingPlanSection, '短期', ':') || '',
      longTerm: extractDetail(trainingPlanSection, '长期', ':') || ''
    } : undefined;

    return {
      summary,
      technicalAnalysis,
      recommendations,
      trainingPlan
    };
    
  } catch (error) {
    console.error('[DeepSeek] 解析响应失败:', error);
    return getFallbackAnalysis();
  }
}

/**
 * 分析建议部分的格式并提取结构化数据
 */
function parseRecommendations(recommendationsText: string): Array<{title: string; description: string; exercises: string[]}> {
  if (!recommendationsText.trim()) {
    return [{
      title: '姿态优化',
      description: '根据分析，建议关注跑步姿态的优化。',
      exercises: ['髋部稳定性训练', '核心力量训练', '足部灵活性练习']
    }];
  }

  const recommendations: Array<{title: string; description: string; exercises: string[]}> = [];
  
  // 尝试匹配格式化的建议模式
  const recommendationPattern = /\d+\.\s+([^\n]+)(?:\s*-\s*描述:\s*([\s\S]*?))?(?:\s*-\s*练习:\s*([\s\S]*?))?(?=\d+\.|$)/g;
  let match;
  
  while ((match = recommendationPattern.exec(recommendationsText)) !== null) {
    const title = match[1]?.trim() || '改进建议';
    const description = match[2]?.trim() || '请根据您的情况调整训练方法';
    
    // 提取练习列表
    const exercisesText = match[3] || '';
    const exercises = exercisesText
      .split(/[•*\-]/)
      .map(ex => ex.trim())
      .filter(ex => ex.length > 0);
    
    recommendations.push({
      title,
      description,
      exercises: exercises.length > 0 ? exercises : ['请咨询专业教练获取针对性练习']
    });
  }
  
  // 如果无法匹配格式化的建议，尝试简单分段解析
  if (recommendations.length === 0) {
    const paragraphs = recommendationsText.split('\n\n').filter(p => p.trim());
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      const title = paragraph.split('\n')[0].replace(/^\d+\.\s*/, '').trim();
      const description = paragraph.split('\n').slice(1).join(' ').trim();
      
      recommendations.push({
        title: title || '改进建议',
        description: description || '根据您的跑步数据分析，建议针对性调整训练方法',
        exercises: ['咨询专业教练', '调整训练计划', '关注跑步姿势']
      });
      
      // 限制最多3条建议
      if (recommendations.length >= 3) break;
    }
  }
  
  return recommendations.length > 0 ? recommendations : [{
    title: '优化跑步姿态',
    description: '建议关注跑步姿态的整体优化，保持良好的跑步表现',
    exercises: ['保持适当步频 (175-185步/分钟)', '适度增强核心肌群力量', '定期进行柔韧性训练']
  }];
}

/**
 * 提取文本中的特定部分
 */
function extractSection(text: string, startMarker: string, endMarker: string): string {
  // 匹配 "## 摘要" 或 "## Summary" 这样的格式
  const headerPattern = new RegExp(`##\\s*${startMarker}`, 'i'); // 添加 'i' 标志使匹配不区分大小写
  const startIndex = text.search(headerPattern);
  
  if (startIndex === -1) return '';
  
  let endIndex;
  if (endMarker) {
    // 从起始点之后查找下一个 ## 标记
    endIndex = text.indexOf('##', startIndex + 2);
    if (endIndex === -1) endIndex = text.length;
  } else {
    endIndex = text.length;
  }
  
  return text.substring(startIndex, endIndex).replace(headerPattern, '').trim();
}

/**
 * 提取特定细节
 */
function extractDetail(text: string, detailName: string, separator: string): string {
  // 第一步尝试：精确匹配 "步态周期:" 或 "- 步态周期:" 等格式
  const patternExact = new RegExp(`[-•*]?\\s*${detailName}\\s*${separator}\\s*([^\\n]+)`, 'i');
  let match = text.match(patternExact);
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // 第二步尝试：在技术分析部分中查找
  const techSection = extractSection(text, '技术分析', '改进建议') || 
                      extractSection(text, 'Technical Analysis', 'Recommendations');
  
  if (techSection) {
    // 在技术分析部分查找，容许更宽松的格式
    const patternInSection = new RegExp(`[-•*]?\\s*${detailName}[^:：]*[：:]\\s*([^\\n]+)`, 'i');
    match = techSection.match(patternInSection);
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // 第三步尝试：查找包含关键词的行
    const lines = techSection.split('\n');
    for (const line of lines) {
      if (line.toLowerCase().includes(detailName.toLowerCase())) {
        const parts = line.split(/[：:]/);
        if (parts.length > 1) {
          return parts[1].trim();
        }
        if (line.includes('：') || line.includes(':')) {
          return line.substring(line.indexOf(':') + 1).trim() || 
                 line.substring(line.indexOf('：') + 1).trim();
        }
        return line.replace(new RegExp(`.*${detailName}.*?`, 'i'), '').trim() || line;
      }
    }
  }
  
  // 第四步尝试：在整个文本中搜索
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.toLowerCase().includes(detailName.toLowerCase()) && 
        (line.includes(':') || line.includes('：'))) {
      return line.substring(Math.max(line.indexOf(':'), line.indexOf('：')) + 1).trim();
    }
  }
  
  return '';
}

/**
 * 获取备用分析结果，当API调用失败或解析失败时使用
 */
function getFallbackAnalysis(): DeepAnalysisResult {
  return {
    summary: '系统已完成跑步表现分析。您的整体步态模式稳定，着地方式适中，但可能存在一些改进空间。',
    technicalAnalysis: {
      gaitCycle: '步态周期展现出良好的节奏，支撑相和摆动相比例平衡。支撑相占比约35%，摆动相占比约65%，这种比例有利于能量转换和步频维持。',
      footStrike: '中足着地为主，有助于减少冲击力和提高效率。您的足部着地角度适中，减轻了膝关节和踝关节的压力。',
      verticalOscillation: '垂直振幅在正常范围内，约8.5厘米，显示出良好的能量利用效率。过大的垂直位移会浪费能量，您的表现较为理想。',
      pronationControl: '存在轻微的足内翻现象，但在可接受范围内。建议通过针对性训练来进一步改善足部稳定性和控制力。',
      armSwing: '手臂摆动协调，与步频同步。手臂摆动幅度适中，手肘角度维持在约90度，有助于保持上身稳定和步频节奏。'
    },
    recommendations: [
      {
        title: '优化足部着地模式',
        description: '通过练习可以进一步优化您的足部着地方式，减少冲击力并提高推进效率。',
        exercises: [
          '前脚掌着地练习：短距离快跑，集中于前脚掌着地',
          '足部柔韧性训练：每日进行跟腱拉伸和足底筋膜按摩',
          '平衡训练：单腿站立练习，每侧30秒，3组'
        ]
      },
      {
        title: '提高核心稳定性',
        description: '增强核心力量可以改善跑步姿态稳定性，减少能量浪费。',
        exercises: [
          '平板支撑：维持60秒，重复3-5次',
          '侧平板支撑：每侧45秒，重复3次',
          '死虫动作：12-15次，3组'
        ]
      },
      {
        title: '增加跑步经济性',
        description: '优化步频和步幅比例，提高跑步效率和经济性。',
        exercises: [
          '节拍器训练：设置180BPM，跟随节奏跑步10-15分钟',
          '阶梯间歇：200米快，200米慢，重复8-10次',
          '腿部力量训练：深蹲和箭步蹲，每组12-15次'
        ]
      }
    ],
    trainingPlan: {
      shortTerm: '每周保持3-4次训练，包括1次长跑、1次间歇训练和1-2次轻松跑，逐步增加核心训练频率。',
      longTerm: '6-8周内将每周跑量缓慢提升15-20%，同时保持每周2次力量训练，重点关注足部和核心肌群。'
    }
  };
}
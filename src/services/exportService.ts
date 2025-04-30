/**
 * 报告导出服务
 * 提供分析报告和训练计划导出功能
 */
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { DeepAnalysisResult } from '@/ai'
import { formatDate } from '@/utils/dateUtils'

// 导入中文字体支持
// 注意：实际字体文件需放在public目录下，这里假设已有noto-sans-sc-regular.ttf文件
// 你可以从 https://fonts.google.com/noto/specimen/Noto+Sans+SC 下载字体文件

// 导入所需类型
type jsPDFWithPlugin = jsPDF & {
  getNumberOfPages: () => number;
  saveGraphicsState: () => void;
  restoreGraphicsState: () => void;
  translate: (x: number, y: number) => void;
  rotate: (angle: number) => void;
}

/**
 * 导出格式选项
 */
export enum ExportFormat {
  PDF = 'pdf',
  IMAGE = 'image'
}

/**
 * 导出报告类型
 */
export enum ReportType {
  ANALYSIS = 'analysis', // 分析报告
  TRAINING_PLAN = 'training-plan', // 训练计划
  COMBINED = 'combined' // 综合报告
}

/**
 * 导出报告选项
 */
export interface ExportOptions {
  fileName?: string; // 文件名
  format?: ExportFormat; // 导出格式
  type?: ReportType; // 报告类型
  includeCharts?: boolean; // 是否包含图表
  includeRecommendations?: boolean; // 是否包含建议
  customLogo?: string; // 自定义Logo URL
  customHeader?: string; // 自定义页眉
  customFooter?: string; // 自定义页脚
  watermark?: boolean; // 是否添加水印
}

/**
 * 分析数据接口
 */
export interface AnalysisData {
  sessionId: string;
  sessionDate?: string;
  sessionType?: string;
  sessionDuration?: string;
  summary: string;
  metrics: any;
  gaitAnalysis: any;
  pressureAnalysis: any;
  recommendations: any[];
  deepSeekData?: DeepAnalysisResult | null;
  isDeepSeekAnalysis?: boolean;
}

/**
 * 默认导出选项
 */
const defaultOptions: ExportOptions = {
  fileName: `跑步分析报告_${formatDate(new Date())}`,
  format: ExportFormat.PDF,
  type: ReportType.COMBINED,
  includeCharts: true,
  includeRecommendations: true,
  watermark: false
}

/**
 * 导出分析报告
 * @param element 要导出的页面元素
 * @param data 分析数据
 * @param options 导出选项
 * @returns 返回Promise，导出成功或失败
 */
export async function exportAnalysisReport(
  element: HTMLElement,
  data: AnalysisData,
  options?: Partial<ExportOptions>
): Promise<boolean> {
  try {
    const mergedOptions = { ...defaultOptions, ...options }
    
    // 生成PDF文件名
    const fileName = mergedOptions.fileName || `跑步分析报告_${formatDate(new Date())}`
    
    // 根据报告类型选择合适的导出逻辑
    if (mergedOptions.format === ExportFormat.PDF) {
      return await exportToPDF(element, data, mergedOptions)
    } else if (mergedOptions.format === ExportFormat.IMAGE) {
      return await exportToImage(element, fileName)
    }
    
    return true
  } catch (error) {
    console.error('导出报告失败:', error)
    return false
  }
}

/**
 * 导出为PDF
 */
async function exportToPDF(
  element: HTMLElement,
  data: AnalysisData,
  options: ExportOptions
): Promise<boolean> {
  const { fileName, type, includeCharts, includeRecommendations, watermark } = options
  
  // 创建PDF文档 (A4尺寸)
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  // 添加中文字体支持
  // 该函数会先检查字体是否已加载
  await addChineseFontSupport(pdf)
  
  // PDF尺寸常量
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 15
  
  // 添加标题和页眉
  addHeader(pdf, data, options)
  
  // 每个部分的起始Y坐标
  let yPosition = 40
  
  // 添加概览部分
  yPosition = await addSummarySection(pdf, data, yPosition, pageWidth, margin)
  
  // 检查是否需要添加新页
  if (yPosition > pageHeight - 50) {
    pdf.addPage()
    yPosition = 20
  }
  
  // 添加核心指标
  if (type === ReportType.ANALYSIS || type === ReportType.COMBINED) {
    yPosition = addMetricsSection(pdf, data, yPosition, pageWidth, margin)
    
    // 添加图表图像（如果选项启用）
    if (includeCharts) {
      // 检查是否需要添加新页
      if (yPosition > pageHeight - 100) {
        pdf.addPage()
        yPosition = 20
      }
      
      yPosition = await addChartsSection(pdf, element, yPosition, pageWidth, margin)
    }
    
    // 检查是否需要添加新页
    if (yPosition > pageHeight - 80) {
      pdf.addPage()
      yPosition = 20
    }
    
    // 添加技术分析（如果使用DeepSeek AI）
    if (data.isDeepSeekAnalysis && data.deepSeekData) {
      yPosition = addTechnicalAnalysis(pdf, data.deepSeekData, yPosition, pageWidth, margin)
    }
  }
  
  // 检查是否需要添加新页
  if (yPosition > pageHeight - 100 && (includeRecommendations || type === ReportType.TRAINING_PLAN)) {
    pdf.addPage()
    yPosition = 20
  }
  
  // 添加建议和训练计划
  if ((includeRecommendations || type === ReportType.TRAINING_PLAN) && 
      ((data.isDeepSeekAnalysis && data.deepSeekData?.recommendations) || data.recommendations)) {
    yPosition = addRecommendationsSection(
      pdf, 
      data.isDeepSeekAnalysis && data.deepSeekData ? data.deepSeekData.recommendations : data.recommendations,
      yPosition, 
      pageWidth, 
      margin
    )
    
    // 添加训练计划（如果有且是训练计划类型）
    if ((type === ReportType.TRAINING_PLAN || type === ReportType.COMBINED) && 
        data.deepSeekData?.trainingPlan) {
      // 检查是否需要添加新页
      if (yPosition > pageHeight - 60) {
        pdf.addPage()
        yPosition = 20
      }
      
      yPosition = addTrainingPlanSection(pdf, data.deepSeekData.trainingPlan, yPosition, pageWidth, margin)
    }
  }
  
  // 添加页脚
  addFooter(pdf, options)
  
  // 添加水印（如果需要）
  if (watermark) {
    addWatermark(pdf, '中长跑实时指导系统')
  }
  
  // 保存PDF
  pdf.save(`${fileName}.pdf`)
  
  return true
}

/**
 * 添加中文字体支持
 * 动态加载中文字体并添加到jsPDF实例
 */
async function addChineseFontSupport(pdf: jsPDF): Promise<void> {
  // 检查是否已有中文字体
  if ((pdf as any).getFontList && (pdf as any).getFontList()['noto-sans-sc']) {
    return // 已加载字体，直接返回
  }
  
  try {
    // 尝试动态加载中文字体 - 使用CDN托管的宋体
    const fontUrl = 'https://cdn.jsdelivr.net/npm/noto-sans-sc@1.0.1/NotoSansSC-Regular.ttf';
    
    // 使用fetch API下载字体
    const response = await fetch(fontUrl)
    if (!response.ok) throw new Error('字体下载失败')
    
    const fontData = await response.arrayBuffer()
    
    // 将ArrayBuffer转换为base64编码的字符串
    const binary = new Uint8Array(fontData);
    let binaryString = '';
    for (let i = 0; i < binary.length; i++) {
      binaryString += String.fromCharCode(binary[i]);
    }
    const fontBase64 = btoa(binaryString);
    
    // 添加字体到PDF(使用base64编码的字体数据)
    // @ts-ignore - 类型定义可能不完整，但API确实支持这种用法
    pdf.addFont(fontBase64, 'noto-sans-sc', 'normal');
    // @ts-ignore
    pdf.addFont(fontBase64, 'noto-sans-sc', 'bold');
    
    // 设置为默认字体
    pdf.setFont('noto-sans-sc');
    
    console.log('中文字体加载成功');
  } catch (error) {
    console.error('加载中文字体失败:', error);
    // 字体加载失败时的降级处理 - 使用内置的简体中文支持
    try {
      // jsPDF 3.0+ 版本支持的方法
      // @ts-ignore - API可能在类型定义中不存在
      if (typeof pdf.addFont === 'function') {
        // 尝试使用等宽字体，对中文支持相对较好
        pdf.setFont('courier');
      }
    } catch (err) {
      console.error('降级中文字体支持也失败:', err);
    }
  }
}

/**
 * 添加PDF页眉
 */
function addHeader(pdf: jsPDF, data: AnalysisData, options: ExportOptions): void {
  const pageWidth = pdf.internal.pageSize.getWidth()
  
  // 标题
  pdf.setFontSize(16)
  pdf.setTextColor(44, 62, 80)
  
  // 根据报告类型设置不同标题
  let title = '跑步分析报告'
  if (options.type === ReportType.TRAINING_PLAN) {
    title = '跑步训练计划'
  } else if (options.type === ReportType.COMBINED) {
    title = '跑步分析与训练计划'
  }
  
  pdf.text(title, pageWidth / 2, 15, { align: 'center' })
  
  // 添加分隔线
  pdf.setLineWidth(0.5)
  pdf.setDrawColor(41, 128, 185)
  pdf.line(15, 20, pageWidth - 15, 20)
  
  // 添加会话信息
  pdf.setFontSize(10)
  pdf.setTextColor(100, 100, 100)
  
  // 创建会话描述
  const sessionInfo = `训练记录: ${data.sessionType || '未知训练类型'} | 时间: ${data.sessionDate || '未知日期'} | 时长: ${data.sessionDuration || '未知'}`
  pdf.text(sessionInfo, pageWidth / 2, 26, { align: 'center' })
  
  // 如果是DeepSeek增强分析，添加标识
  if (data.isDeepSeekAnalysis) {
    pdf.setFontSize(9)
    pdf.setTextColor(46, 204, 113)
    pdf.text('DeepSeek AI 增强分析', pageWidth / 2, 32, { align: 'center' })
  }
}

/**
 * 添加概览部分
 */
async function addSummarySection(
  pdf: jsPDF, 
  data: AnalysisData, 
  y: number, 
  pageWidth: number, 
  margin: number
): Promise<number> {
  // 添加小节标题
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(41, 128, 185)
  pdf.text('训练总结', margin, y)
  
  y += 7
  
  // 添加概览内容
  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(60, 60, 60)
  
  // 使用summary文本，处理长文本换行
  const summary = data.isDeepSeekAnalysis && data.deepSeekData?.summary ? 
                  data.deepSeekData.summary : 
                  data.summary
                  
  const splitText = pdf.splitTextToSize(summary, pageWidth - (margin * 2))
  pdf.text(splitText, margin, y)
  
  return y + splitText.length * 6 + 5 // 返回下一个内容的y坐标
}

/**
 * 添加指标部分
 */
function addMetricsSection(
  pdf: jsPDF, 
  data: AnalysisData, 
  y: number, 
  pageWidth: number, 
  margin: number
): number {
  // 添加小节标题
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(41, 128, 185)
  pdf.text('核心指标', margin, y)
  
  y += 10
  
  // 表格格式显示指标
  pdf.setFontSize(10)
  
  // 设置标题行
  pdf.setFont('helvetica', 'bold')
  pdf.setFillColor(240, 240, 240)
  pdf.rect(margin, y - 5, pageWidth - (margin * 2), 8, 'F')
  pdf.setTextColor(60, 60, 60)
  
  const colWidth = (pageWidth - (margin * 2)) / 3
  pdf.text('指标', margin + 5, y)
  pdf.text('数值', margin + colWidth + 5, y)
  pdf.text('评估', margin + colWidth * 2 + 5, y)
  
  y += 8
  
  // 填充指标行
  pdf.setFont('helvetica', 'normal')
  const metrics = data.metrics
  
  // 添加步频
  pdf.text('平均步频', margin + 5, y)
  pdf.text(`${metrics.avgCadence || '--'} 步/分`, margin + colWidth + 5, y)
  pdf.text(getMetricAssessment('cadence', metrics.avgCadence), margin + colWidth * 2 + 5, y)
  y += 7
  
  // 添加步幅
  pdf.text('平均步幅', margin + 5, y)
  pdf.text(`${metrics.avgStride || '--'} 厘米`, margin + colWidth + 5, y)
  pdf.text(getMetricAssessment('stride', metrics.avgStride), margin + colWidth * 2 + 5, y)
  y += 7
  
  // 添加着地方式
  pdf.text('着地方式', margin + 5, y)
  pdf.text(`${metrics.landingPattern || '--'}`, margin + colWidth + 5, y)
  pdf.text(getMetricAssessment('landing', metrics.landingPattern), margin + colWidth * 2 + 5, y)
  y += 7
  
  // 添加垂直振幅
  pdf.text('垂直振幅', margin + 5, y)
  pdf.text(`${metrics.verticalOscillation || '--'} 厘米`, margin + colWidth + 5, y)
  pdf.text(getMetricAssessment('oscillation', metrics.verticalOscillation), margin + colWidth * 2 + 5, y)
  y += 7
  
  // 添加触地时间
  pdf.text('触地时间', margin + 5, y)
  pdf.text(`${metrics.groundContactTime || '--'} 毫秒`, margin + colWidth + 5, y)
  pdf.text(getMetricAssessment('contactTime', metrics.groundContactTime), margin + colWidth * 2 + 5, y)
  y += 7
  
  // 添加姿态评分
  pdf.text('姿态评分', margin + 5, y)
  pdf.text(`${metrics.postureScore || '--'}/100`, margin + colWidth + 5, y)
  pdf.text(getMetricAssessment('score', metrics.postureScore), margin + colWidth * 2 + 5, y)
  
  return y + 15 // 返回下一个内容的y坐标
}

/**
 * 添加图表部分
 */
async function addChartsSection(
  pdf: jsPDF,
  element: HTMLElement,
  y: number,
  pageWidth: number,
  margin: number
): Promise<number> {
  // 添加小节标题
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(41, 128, 185)
  pdf.text('图表分析', margin, y)
  
  y += 10
  
  // 查找图表元素
  const chartElements = element.querySelectorAll('.chart-wrapper')
  if (chartElements.length === 0) {
    return y // 没有图表则直接返回
  }
  
  // 添加雷达图
  const radarChart = element.querySelector('.overview-chart')
  if (radarChart) {
    try {
      // 使用类型断言来绕过类型检查
      const canvasOptions = {
        background: undefined,
        scale: 2 // 提高清晰度
      } as any;
      
      const canvas = await html2canvas(radarChart as HTMLElement, canvasOptions)
      
      const imgData = canvas.toDataURL('image/png')
      const imgWidth = 80
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', margin, y, imgWidth, imgHeight)
      
      // 添加步态周期图
      const gaitChart = element.querySelector('.gait-chart')
      if (gaitChart) {
        // 使用类型断言来绕过类型检查
        const gaitCanvasOptions = {
          background: undefined,
          scale: 2 // 提高清晰度
        } as any;
        
        const gaitCanvas = await html2canvas(gaitChart as HTMLElement, gaitCanvasOptions)
        
        const gaitImgData = gaitCanvas.toDataURL('image/png')
        pdf.addImage(gaitImgData, 'PNG', pageWidth - margin - 80, y, 80, imgHeight)
        
        y += imgHeight + 5
      } else {
        y += imgHeight + 5
      }
    } catch (error) {
      console.error('图表导出错误:', error)
    }
  }
  
  return y + 10 // 返回下一个内容的y坐标
}

/**
 * 添加技术分析部分
 */
function addTechnicalAnalysis(
  pdf: jsPDF, 
  deepSeekData: DeepAnalysisResult, 
  y: number, 
  pageWidth: number, 
  margin: number
): number {
  // 添加小节标题
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(41, 128, 185)
  pdf.text('技术分析', margin, y)
  
  y += 10
  
  // 添加技术分析内容
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(60, 60, 60)
  
  const { technicalAnalysis } = deepSeekData
  
  // 步态周期
  pdf.setFont('helvetica', 'bold')
  pdf.text('步态周期：', margin, y)
  pdf.setFont('helvetica', 'normal')
  const gaitText = pdf.splitTextToSize(technicalAnalysis.gaitCycle, pageWidth - (margin * 2) - 20)
  pdf.text(gaitText, margin + 20, y)
  y += gaitText.length * 5
  
  // 着地方式
  pdf.setFont('helvetica', 'bold')
  pdf.text('着地方式：', margin, y)
  pdf.setFont('helvetica', 'normal')
  const strikText = pdf.splitTextToSize(technicalAnalysis.footStrike, pageWidth - (margin * 2) - 20)
  pdf.text(strikText, margin + 20, y)
  y += strikText.length * 5
  
  // 垂直振幅
  pdf.setFont('helvetica', 'bold')
  pdf.text('垂直振幅：', margin, y)
  pdf.setFont('helvetica', 'normal')
  const oscText = pdf.splitTextToSize(technicalAnalysis.verticalOscillation, pageWidth - (margin * 2) - 20)
  pdf.text(oscText, margin + 20, y)
  y += oscText.length * 5
  
  // 足部控制
  pdf.setFont('helvetica', 'bold')
  pdf.text('足部控制：', margin, y)
  pdf.setFont('helvetica', 'normal')
  const pronText = pdf.splitTextToSize(technicalAnalysis.pronationControl, pageWidth - (margin * 2) - 20)
  pdf.text(pronText, margin + 20, y)
  y += pronText.length * 5
  
  // 手臂摆动
  pdf.setFont('helvetica', 'bold')
  pdf.text('手臂摆动：', margin, y)
  pdf.setFont('helvetica', 'normal')
  const armText = pdf.splitTextToSize(technicalAnalysis.armSwing, pageWidth - (margin * 2) - 20)
  pdf.text(armText, margin + 20, y)
  y += armText.length * 5
  
  return y + 10 // 返回下一个内容的y坐标
}

/**
 * 添加建议部分
 */
function addRecommendationsSection(
  pdf: jsPDF, 
  recommendations: Array<{title: string; description: string; exercises: string[]}>,
  y: number, 
  pageWidth: number, 
  margin: number
): number {
  // 添加小节标题
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(41, 128, 185)
  pdf.text('改进建议', margin, y)
  
  y += 10
  
  if (!recommendations || recommendations.length === 0) {
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'italic')
    pdf.setTextColor(100, 100, 100)
    pdf.text('无特别建议。', margin, y)
    return y + 10
  }
  
  // 逐条添加建议
  recommendations.forEach((recommendation, index) => {
    // 检查是否需要添加新页
    if (y > pdf.internal.pageSize.getHeight() - 50) {
      pdf.addPage()
      y = 20
    }
    
    // 建议标题
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(46, 134, 193)
    pdf.text(`${index + 1}. ${recommendation.title}`, margin, y)
    
    y += 7
    
    // 建议描述
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(60, 60, 60)
    const descText = pdf.splitTextToSize(recommendation.description, pageWidth - (margin * 2) - 5)
    pdf.text(descText, margin + 5, y)
    
    y += descText.length * 5 + 5
    
    // 推荐练习
    if (recommendation.exercises && recommendation.exercises.length > 0) {
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'italic')
      pdf.text('推荐练习:', margin + 5, y)
      
      y += 5
      
      recommendation.exercises.forEach((exercise) => {
        const exerciseText = pdf.splitTextToSize(`• ${exercise}`, pageWidth - (margin * 2) - 10)
        pdf.text(exerciseText, margin + 10, y)
        y += exerciseText.length * 5
      })
    }
    
    y += 10 // 为下一个建议添加间距
  })
  
  return y // 返回下一个内容的y坐标
}

/**
 * 添加训练计划部分
 */
function addTrainingPlanSection(
  pdf: jsPDF, 
  trainingPlan: { shortTerm?: string; longTerm?: string }, 
  y: number, 
  pageWidth: number, 
  margin: number
): number {
  if (!trainingPlan || (!trainingPlan.shortTerm && !trainingPlan.longTerm)) {
    return y // 没有训练计划数据则直接返回
  }
  
  // 添加小节标题
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(41, 128, 185)
  pdf.text('训练计划', margin, y)
  
  y += 10
  
  // 短期计划
  if (trainingPlan.shortTerm) {
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(46, 134, 193)
    pdf.text('短期计划（1-2周）', margin, y)
    
    y += 7
    
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(60, 60, 60)
    const shortText = pdf.splitTextToSize(trainingPlan.shortTerm, pageWidth - (margin * 2) - 5)
    pdf.text(shortText, margin + 5, y)
    
    y += shortText.length * 5 + 8
  }
  
  // 长期计划
  if (trainingPlan.longTerm) {
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(46, 134, 193)
    pdf.text('长期计划（1-2月）', margin, y)
    
    y += 7
    
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(60, 60, 60)
    const longText = pdf.splitTextToSize(trainingPlan.longTerm, pageWidth - (margin * 2) - 5)
    pdf.text(longText, margin + 5, y)
    
    y += longText.length * 5 + 5
  }
  
  return y // 返回下一个内容的y坐标
}

/**
 * 添加页脚
 */
function addFooter(pdf: jsPDF, options: ExportOptions): void {
  // 类型转换为扩展后的jsPDF类型
  const pdfWithPlugins = pdf as unknown as jsPDFWithPlugin
  const pageCount = pdfWithPlugins.getNumberOfPages()
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  
  // 在每一页添加页脚
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i)
    
    // 添加分隔线
    pdf.setLineWidth(0.5)
    pdf.setDrawColor(200, 200, 200)
    pdf.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15)
    
    // 添加页脚文字
    pdf.setFontSize(8)
    pdf.setTextColor(150, 150, 150)
    pdf.setFont('helvetica', 'normal')
    
    // 左侧：导出日期
    pdf.text(`导出时间: ${formatDate(new Date())}`, 15, pageHeight - 10)
    
    // 中间：自定义页脚或默认文字
    const footerText = options.customFooter || '中长跑实时指导系统'
    pdf.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' })
    
    // 右侧：页码
    pdf.text(`第 ${i} 页 / 共 ${pageCount} 页`, pageWidth - 15, pageHeight - 10, { align: 'right' })
  }
}

/**
 * 添加水印
 */
function addWatermark(pdf: jsPDF, text: string): void {
  // 类型转换为扩展后的jsPDF类型
  const pdfWithPlugins = pdf as unknown as jsPDFWithPlugin
  const pageCount = pdfWithPlugins.getNumberOfPages()
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  
  // 在每一页添加水印
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i)
    
    // 水印设置
    pdf.setFontSize(40)
    pdf.setTextColor(230, 230, 230) // 浅灰色
    pdf.setFont('helvetica', 'normal')
    
    // 转换角度（45度）并添加水印
    pdfWithPlugins.saveGraphicsState()
    pdfWithPlugins.translate(pageWidth / 2, pageHeight / 2)
    pdfWithPlugins.rotate(-45)
    pdf.text(text, 0, 0, { align: 'center' })
    pdfWithPlugins.restoreGraphicsState()
  }
}

/**
 * 导出为图片
 */
async function exportToImage(element: HTMLElement, fileName: string): Promise<boolean> {
  try {
    // 使用html2canvas将元素转换为图片
    const canvasOptions = {
      background: '#f5f9ff', // 使用背景色
      scale: 2 // 提高清晰度
    } as any;
    
    const canvas = await html2canvas(element, canvasOptions)
    
    // 转换为图片并下载
    const imgData = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = imgData
    link.download = `${fileName}.png`
    link.click()
    
    return true
  } catch (error) {
    console.error('导出图片失败:', error)
    return false
  }
}

/**
 * 获取指标评估文字
 */
function getMetricAssessment(metricType: string, value: any): string {
  if (value === undefined || value === null) {
    return '未知'
  }
  
  switch (metricType) {
    case 'cadence':
      if (value >= 175 && value <= 185) return '优秀（理想范围）'
      if (value >= 170 && value < 175) return '良好'
      if (value > 185 && value <= 190) return '良好'
      if (value < 170) return '偏低'
      return '偏高'
      
    case 'stride':
      if (value >= 100 && value <= 130) return '良好'
      if (value < 100) return '偏短'
      return '偏长'
      
    case 'landing':
      if (value === '中足着地') return '理想'
      if (value === '前足着地') return '适合短跑/冲刺'
      return '可能增加冲击力'
      
    case 'oscillation':
      if (value <= 8) return '优秀'
      if (value > 8 && value <= 10) return '良好'
      return '偏高'
      
    case 'contactTime':
      if (value < 200) return '优秀'
      if (value >= 200 && value <= 240) return '良好'
      return '偏长'
      
    case 'score':
      if (value >= 90) return '优秀'
      if (value >= 80 && value < 90) return '良好'
      if (value >= 70 && value < 80) return '一般'
      return '需改进'
      
    default:
      return '未知'
  }
}

/**
 * 导出训练计划为CSV
 * @param data 分析数据
 * @param options 导出选项
 * @returns 返回Promise，导出成功或失败
 */
export function exportTrainingPlanToCSV(
  data: AnalysisData,
  options?: Partial<ExportOptions>
): boolean {
  try {
    if (!data.deepSeekData?.recommendations || !data.deepSeekData?.trainingPlan) {
      console.warn('没有训练计划数据可导出')
      return false
    }
    
    const fileName = options?.fileName || `训练计划_${formatDate(new Date())}`
    const recommendations = data.deepSeekData.recommendations
    const { shortTerm, longTerm } = data.deepSeekData.trainingPlan
    
    // 构建CSV内容
    let csvContent = '类型,内容\r\n'
    
    // 添加短期计划
    if (shortTerm) {
      csvContent += `短期计划,"${shortTerm.replace(/"/g, '""')}"\r\n`
    }
    
    // 添加长期计划
    if (longTerm) {
      csvContent += `长期计划,"${longTerm.replace(/"/g, '""')}"\r\n`
    }
    
    // 添加建议和练习
    if (recommendations && recommendations.length > 0) {
      csvContent += '\r\n改进重点,描述,练习\r\n'
      
      recommendations.forEach(rec => {
        const exercises = rec.exercises?.join('; ').replace(/"/g, '""') || ''
        csvContent += `"${rec.title.replace(/"/g, '""')}","${rec.description.replace(/"/g, '""')}","${exercises}"\r\n`
      })
    }
    
    // 创建blob并下载
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `${fileName}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    return true
  } catch (error) {
    console.error('导出CSV失败:', error)
    return false
  }
}
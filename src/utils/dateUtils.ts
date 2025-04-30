/**
 * 日期工具类
 */

/**
 * 格式化日期
 * @param date 日期对象
 * @param format 格式字符串，默认为 'YYYY-MM-DD HH:mm'
 * @returns 格式化后的日期字符串
 */
export function formatDate(date: Date, format: string = 'YYYY-MM-DD HH:mm'): string {
  const pad = (n: number): string => n < 10 ? `0${n}` : `${n}`
  
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())
  
  return format
    .replace('YYYY', year.toString())
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

/**
 * 从ISO字符串解析日期
 * @param dateString 日期字符串
 * @returns 日期对象
 */
export function parseDate(dateString: string): Date {
  return new Date(dateString)
}

/**
 * 获取友好的日期显示
 * @param date 日期对象或字符串
 * @returns 友好的日期显示字符串
 */
export function getFriendlyDate(date: Date | string): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  
  // 计算日期差异（毫秒）
  const diff = now.getTime() - targetDate.getTime()
  const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return '今天'
  } else if (diffDays === 1) {
    return '昨天'
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)}周前`
  } else {
    return formatDate(targetDate, 'YYYY-MM-DD')
  }
}
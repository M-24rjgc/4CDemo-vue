/**
 * 数据处理服务
 * 用于处理上传的训练数据，包括足压数据(CSV)和IMU传感器数据(TXT)
 */

/**
 * 处理足压数据CSV文件
 * @param {string} csvText - CSV文件内容
 * @returns {object} - 处理后的数据和统计信息
 */
export const processFootPressureData = async (csvText) => {
  // 按行分割
  const lines = csvText.split('\n').filter(line => line.trim());
  
  // 解析CSV标题行
  const headers = lines[0].split(',');
  
  // 检查数据格式
  if (!headers[0].includes('ʱ') && !headers[0].includes('时间')) {
    throw new Error('足压数据格式不正确，无法找到时间戳列');
  }
  
  // 提取R1-R48和L1-L48列的索引
  const rightSensorIndices = [];
  const leftSensorIndices = [];
  
  headers.forEach((header, index) => {
    if (header.startsWith('R') && header.includes('(g)')) {
      rightSensorIndices.push(index);
    } else if (header.startsWith('L') && header.includes('(g)')) {
      leftSensorIndices.push(index);
    }
  });
  
  // 处理每一行数据，从第二行开始（跳过标题）
  const processedData = [];
  let previousTimestamp = null;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = line.split(',');
    
    // 检查行是否有足够的列
    if (values.length < Math.max(...rightSensorIndices, ...leftSensorIndices) + 1) {
      continue;  // 跳过格式不正确的行
    }
    
    // 获取时间戳
    const timestamp = values[0];
    if (!timestamp) continue;  // 跳过没有时间戳的行
    
    // 计算右脚和左脚每个传感器的压力值
    let rightTotal = 0;
    let leftTotal = 0;
    
    // 累加右脚传感器压力
    for (const index of rightSensorIndices) {
      const value = parseFloat(values[index]) || 0;
      rightTotal += value;
    }
    
    // 累加左脚传感器压力
    for (const index of leftSensorIndices) {
      const value = parseFloat(values[index]) || 0;
      leftTotal += value;
    }
    
    // 计算传感器激活情况（非零值的传感器数）
    const rightActiveSensors = rightSensorIndices.filter(index => parseFloat(values[index]) > 0).length;
    const leftActiveSensors = leftSensorIndices.filter(index => parseFloat(values[index]) > 0).length;
    
    // 计算足压分布特征
    const rightSensorValues = rightSensorIndices.map(index => parseFloat(values[index]) || 0);
    const leftSensorValues = leftSensorIndices.map(index => parseFloat(values[index]) || 0);
    
    // 计算足压中心点（简化计算，使用加权平均）
    const rightCenterX = calculateWeightedCenter(rightSensorValues.slice(0, 24));
    const rightCenterY = calculateWeightedCenter(rightSensorValues.slice(24, 48));
    const leftCenterX = calculateWeightedCenter(leftSensorValues.slice(0, 24));
    const leftCenterY = calculateWeightedCenter(leftSensorValues.slice(24, 48));
    
    // 添加处理后的数据点
    processedData.push({
      timestamp,
      rightTotal,
      leftTotal,
      rightActiveSensors,
      leftActiveSensors,
      rightCenterX,
      rightCenterY,
      leftCenterX,
      leftCenterY,
      rightPressureDistribution: rightSensorValues,
      leftPressureDistribution: leftSensorValues
    });
    
    previousTimestamp = timestamp;
  }
  
  // 计算统计信息
  const totalPoints = processedData.length;
  
  // 估算采样频率（假设每秒约50个样本点）
  const frequency = estimateFrequency(processedData.map(d => d.timestamp));
  
  // 计算持续时间
  const firstTimestamp = processedData[0]?.timestamp;
  const lastTimestamp = processedData[processedData.length - 1]?.timestamp;
  const duration = calculateDuration(firstTimestamp, lastTimestamp);
  
  return {
    processedData,
    summary: {
      totalPoints,
      frequency,
      duration
    }
  };
};

/**
 * 处理IMU传感器数据TXT文件
 * @param {string} txtText - TXT文件内容
 * @returns {object} - 处理后的数据和统计信息
 */
export const processImuData = async (txtText) => {
  // 按行分割
  const lines = txtText.split('\n').filter(line => line.trim());
  
  // 处理IMU数据
  const processedData = [];
  let currentDataPoint = {};
  
  // 每六行一组数据
  for (let i = 0; i < lines.length; i += 6) {
    if (i + 5 >= lines.length) break; // 确保有完整的6行数据
    
    // 解析每一行数据
    const axMatch = lines[i].match(/AX:\s+(-?\d+\.\d+)\s+g/);
    const ayMatch = lines[i + 1].match(/AY:\s+(-?\d+\.\d+)\s+g/);
    const azMatch = lines[i + 2].match(/AZ:\s+(-?\d+\.\d+)\s+g/);
    const gxMatch = lines[i + 3].match(/GX:\s+(-?\d+\.\d+)°\/s/);
    const gyMatch = lines[i + 4].match(/GY:\s+(-?\d+\.\d+)°\/s/);
    const gzMatch = lines[i + 5].match(/GZ:\s+(-?\d+\.\d+)°\/s/);
    
    // 确保所有数据都匹配成功
    if (axMatch && ayMatch && azMatch && gxMatch && gyMatch && gzMatch) {
      const dataPoint = {
        ax: parseFloat(axMatch[1]),
        ay: parseFloat(ayMatch[1]),
        az: parseFloat(azMatch[1]),
        gx: parseFloat(gxMatch[1]),
        gy: parseFloat(gyMatch[1]),
        gz: parseFloat(gzMatch[1])
      };
      
      // 计算合成加速度和角速度
      dataPoint.accelerationMagnitude = calculateMagnitude(
        dataPoint.ax,
        dataPoint.ay,
        dataPoint.az
      );
      
      dataPoint.gyroscopeMagnitude = calculateMagnitude(
        dataPoint.gx,
        dataPoint.gy,
        dataPoint.gz
      );
      
      // 添加到处理后的数据
      processedData.push(dataPoint);
    }
  }
  
  // 计算统计信息
  const totalPoints = processedData.length;
  
  // IMU数据通常为100Hz采样率
  const frequency = 100; 
  
  // 计算持续时间（秒）
  const duration = totalPoints / frequency;
  
  // 添加估计的时间戳（因为原始数据没有）
  processedData.forEach((point, index) => {
    point.estimatedTime = index / frequency;
  });
  
  console.log(`成功处理IMU数据: ${totalPoints}个数据点, 持续${duration}秒`);
  
  return {
    processedData,
    summary: {
      totalPoints,
      frequency,
      duration
    }
  };
};

/**
 * 完成数据点处理并添加到结果数组
 * @param {object} dataPoint - 当前数据点对象
 * @param {array} resultArray - 结果数组
 */
const finishDataPoint = (dataPoint, resultArray) => {
  // 确认数据点是否包含所有必需的属性
  const requiredProps = ['ax', 'ay', 'az', 'gx', 'gy', 'gz'];
  const hasAllProps = requiredProps.every(prop => dataPoint.hasOwnProperty(prop) && 
                                         !isNaN(dataPoint[prop]));
  
  if (hasAllProps) {
    // 计算合成加速度和角速度
    dataPoint.accelerationMagnitude = calculateMagnitude(
      dataPoint.ax, 
      dataPoint.ay, 
      dataPoint.az
    );
    
    dataPoint.gyroscopeMagnitude = calculateMagnitude(
      dataPoint.gx, 
      dataPoint.gy, 
      dataPoint.gz
    );
    
    resultArray.push({...dataPoint});
  } else {
    console.warn('跳过不完整的数据点', dataPoint);
  }
};

/**
 * 计算加权中心点
 * @param {Array} values - 传感器值数组
 * @returns {number} - 加权中心位置
 */
const calculateWeightedCenter = (values) => {
  const sum = values.reduce((acc, val) => acc + val, 0);
  if (sum === 0) return 0;
  
  let weightedSum = 0;
  for (let i = 0; i < values.length; i++) {
    weightedSum += (i + 1) * values[i];
  }
  
  return weightedSum / sum;
};

/**
 * 计算向量的幅度
 * @param {number} x - X分量
 * @param {number} y - Y分量
 * @param {number} z - Z分量
 * @returns {number} - 向量幅度
 */
const calculateMagnitude = (x, y, z) => {
  return Math.sqrt(x*x + y*y + z*z);
};

/**
 * 估算数据的采样频率
 * @param {Array} timestamps - 时间戳数组
 * @returns {number} - 估计的采样频率 (Hz)
 */
const estimateFrequency = (timestamps) => {
  if (timestamps.length < 2) return 0;
  
  // 计算时间差的平均值
  let totalTimeDiff = 0;
  let validTimeDiffs = 0;
  
  for (let i = 1; i < timestamps.length; i++) {
    const time1 = parseTimestamp(timestamps[i-1]);
    const time2 = parseTimestamp(timestamps[i]);
    
    if (time1 && time2) {
      const timeDiff = (time2 - time1) / 1000; // 转换为秒
      if (timeDiff > 0) {
        totalTimeDiff += timeDiff;
        validTimeDiffs++;
      }
    }
  }
  
  if (validTimeDiffs === 0) return 50; // 默认值，如果无法计算
  
  const avgTimeDiff = totalTimeDiff / validTimeDiffs;
  return Math.round(1 / avgTimeDiff); // 频率 = 1 / 周期
};

/**
 * 解析时间戳为Date对象
 * @param {string} timestamp - 时间戳字符串
 * @returns {Date|null} - 解析后的Date对象，失败则返回null
 */
const parseTimestamp = (timestamp) => {
  try {
    // 尝试解析"年/月/日 时:分:秒.毫秒"格式
    return new Date(timestamp);
  } catch (error) {
    return null;
  }
};

/**
 * 计算两个时间戳之间的持续时间（秒）
 * @param {string} startTimestamp - 开始时间戳
 * @param {string} endTimestamp - 结束时间戳
 * @returns {number} - 持续时间（秒）
 */
const calculateDuration = (startTimestamp, endTimestamp) => {
  if (!startTimestamp || !endTimestamp) return 0;
  
  const startTime = parseTimestamp(startTimestamp);
  const endTime = parseTimestamp(endTimestamp);
  
  if (!startTime || !endTime) return 0;
  
  return (endTime - startTime) / 1000; // 转换为秒
};
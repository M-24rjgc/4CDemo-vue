# 中长跑实时指导系统

基于多模态传感器和边缘AI的中长跑实时姿态分析与指导系统。该系统利用IMU和足压传感器数据，在设备本地进行实时分析，为跑者提供姿态评分、步态分析和改进建议。

## 功能特性

- **实时数据分析**：采集IMU和足压传感器数据，进行实时信号处理和特征提取
- **步态相位检测**：利用AI模型识别支撑相和摆动相，分析跑步周期
- **姿态评分**：基于多维度指标给出综合跑步姿态质量评分
- **足压分析**：分析足部着地方式和压力分布
- **改进建议**：根据分析结果提供个性化的改进建议
- **历史数据**：保存训练历史，支持长期进步追踪
- **深度分析**：提供详细的步态分析报告和对比功能
- **AI引擎**：集成TensorFlow.js的智能分析引擎，包含以下核心功能：
  - **专家知识系统**：基于专业跑步知识的规则引擎，提供精准指导
  - **个性化学习**：根据用户历史数据调整分析参数，实现个性化适应
  - **异常检测**：识别和分析跑步姿态中的异常模式
  - **步态周期分类**：精确识别跑步周期的8个关键阶段

## 技术栈

- **前端**：Vue 3, TypeScript, Element Plus, ECharts
- **后端**：Python, Flask, Socket.IO
- **数据处理**：NumPy, SciPy, Pandas
- **AI推理**：TensorFlow.js
- **系统架构**：边缘计算架构，无需云服务支持

## 系统架构

系统采用多层架构设计，包括以下几个主要部分：

1. **数据采集层**：从IMU和足压传感器获取原始数据
2. **信号处理层**：对原始数据进行滤波和特征提取
3. **推理层**：使用TensorFlow.js模型在浏览器中执行推理
4. **应用层**：包括Web界面和用户交互功能
5. **AI引擎层**：处理智能分析和决策的核心组件
   - **核心引擎**：整合各AI模块的统一接口
   - **专家系统**：基于规则的专业知识库
   - **个性化模块**：用户数据分析和学习系统
   - **模型管理**：负责TensorFlow.js模型的加载和维护

## 快速启动

### 前端部分

```bash
# 进入项目目录
cd running-guidance-system

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 后端部分

```bash
# 安装需要的Python包
pip install flask flask-cors flask-socketio

# 启动后端服务
python server.py
```

或者使用集成启动脚本：

```bash
# 一键启动系统
python run.py
```

## 详细安装方法

### 环境要求

- Node.js 16+
- Python 3.8+
- 支持的操作系统：Windows, macOS, Linux

### 详细安装步骤

1. 克隆仓库：

```bash
git clone https://github.com/yourusername/running-guidance-system.git
cd running-guidance-system
```

2. 安装前端依赖：

```bash
npm install
```

3. 安装后端依赖：

```bash
pip install -r requirements.txt
```

## 使用方法

访问前端界面：[http://localhost:5173](http://localhost:5173)

系统提供四个主要页面：

1. **首页**：系统介绍和入口
2. **实时仪表盘**：显示实时数据和分析结果
3. **历史数据**：查看历史训练记录和趋势
4. **深度分析**：提供详细的步态分析和改进建议

### 数据采集

1. 在实时仪表盘页面，可以选择使用真实传感器或模拟数据
2. 点击"开始采集"按钮开始数据采集和分析
3. 系统将实时显示各项指标和图表
4. 点击"停止采集"保存当前会话数据

## 项目结构

```
-- src/                 # 前端源代码
   -- views/            # 页面组件
   -- components/       # 可复用组件
   -- stores/           # Pinia状态管理
   -- assets/           # 静态资源
   -- router/           # 路由配置
   -- ai/               # AI引擎模块
      -- adapter.ts     # 与其他系统组件通信的适配器
      -- engine.ts      # 核心AI引擎实现
      -- expertSystem.ts # 专家知识系统
      -- index.ts       # 模块入口和导出
      -- modelLoader.ts # TensorFlow.js模型加载和管理
      -- personalization.ts # 个性化学习和用户适应模块
      -- types.ts       # AI模块类型定义

-- server.py            # 后端服务器入口
-- run.py               # 便捷启动脚本
```

## 许可证

MIT License

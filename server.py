#!/usr/bin/env python
"""
中长跑实时指导系统后端服务

功能说明：
- 提供RESTful API接口，支持历史数据查询和分析结果获取
- 通过Socket.IO实现实时数据传输和反馈
- 包含模拟数据生成模块，用于测试和开发阶段
- 支持静态文件服务，可直接部署前端Vue应用

技术架构：
- Flask框架提供Web服务和API
- Flask-SocketIO实现双向实时通信
- Flask-CORS处理跨域资源共享
- 支持同步和异步数据处理模式

API端点：
- GET /api/history - 获取历史训练数据
- GET /api/analysis/<session_id> - 获取特定训练会话的详细分析

Socket.IO事件：
- connect/disconnect - 客户端连接/断开事件
- start_collection - 开始数据采集
- stop_collection - 停止数据采集
- get_feedback - 获取实时训练反馈
- sensor_data - 服务器推送传感器数据

使用方法：
python server.py [--port PORT]
"""

import os
import time
import json
import math
import random
from datetime import datetime, timedelta
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit

app = Flask(__name__, static_folder='dist')
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# 模拟数据
class DataSimulator:
    def __init__(self):
        self.is_running = False
        self.start_time = None
        
    def start(self):
        """开始数据模拟"""
        self.is_running = True
        self.start_time = time.time()
        
    def stop(self):
        """停止数据模拟"""
        self.is_running = False
        
    def get_current_data(self):
        """获取当前模拟数据"""
        if not self.is_running:
            return None
            
        elapsed = time.time() - self.start_time
        
        # 模拟步频 (160-180步/分钟)
        cadence = 160 + int(10 * math.sin(elapsed / 60) + random.randint(0, 10))
        
        # 模拟步幅 (100-120厘米)
        stride_length = 100 + int(10 * math.cos(elapsed / 90) + random.randint(0, 10))
        
        # 模拟姿态评分 (60-95分)
        posture_score = 75 + int(15 * math.sin(elapsed / 120) + random.randint(-5, 5))
        posture_score = max(60, min(95, posture_score))
        
        # 模拟足压比例 (40:60 - 60:40)
        front_pressure = 40 + int(10 * math.sin(elapsed / 45) + random.randint(0, 10))
        front_pressure = max(40, min(60, front_pressure))
        pressure_ratio = f"{front_pressure}:{100-front_pressure}"
        
        # 模拟加速度数据
        acceleration = [
            time.time() * 1000,  # 时间戳
            math.sin(elapsed / 0.5) * 2 + (random.random() - 0.5),  # X轴
            math.cos(elapsed / 0.5) * 2 + (random.random() - 0.5),  # Y轴
            math.sin(elapsed / 0.3) * 1.5 + (random.random() - 0.5)  # Z轴
        ]
        
        # 模拟足压数据
        pressure = [
            time.time() * 1000,  # 时间戳
            abs(math.sin(elapsed / 0.6) * 3) + 2 + (random.random() - 0.5),  # 前脚掌
            abs(math.sin(elapsed / 0.6 + 1) * 2) + 1 + (random.random() - 0.5),  # 中脚掌
            abs(math.cos(elapsed / 0.6) * 2.5) + 1.5 + (random.random() - 0.5),  # 后脚掌
            random.random() * 2  # 外侧
        ]
        
        return {
            "timestamp": time.time() * 1000,
            "cadence": cadence,
            "strideLength": stride_length,
            "postureScore": posture_score,
            "pressureRatio": pressure_ratio,
            "acceleration": acceleration,
            "pressure": pressure
        }

# 创建模拟器实例
simulator = DataSimulator()

# 模拟历史数据生成
def generate_history_data():
    """生成模拟的历史数据"""
    now = datetime.now()
    
    # 生成最近30天的记录
    records = []
    for i in range(30):
        date = now - timedelta(days=i)
        # 随机决定这一天是否有训练
        if random.random() < 0.5:
            continue
            
        # 随机时长 (分钟)
        duration = random.randint(20, 60)
        
        # 随机步频
        avg_cadence = random.randint(165, 185)
        
        # 随机步幅
        avg_stride = random.randint(100, 120)
        
        # 随机评分
        avg_score = random.randint(65, 95)
        
        # 随机反馈
        feedbacks = [
            "步频稳定，姿态良好",
            "足外翻角度过大，建议调整",
            "前后足压比例良好",
            "支撑相时间偏长",
            "整体表现良好",
            "垂直振幅偏大，能量消耗增加",
            "手臂摆动幅度不足"
        ]
        feedback = random.choice(feedbacks)
        
        records.append({
            "id": len(records) + 1,
            "date": date.strftime("%Y-%m-%d"),
            "duration": f"{duration}分钟",
            "avgCadence": avg_cadence,
            "avgStride": avg_stride,
            "avgScore": avg_score,
            "feedback": feedback
        })
    
    # 按日期排序
    records.sort(key=lambda x: x["date"], reverse=True)
    return records

# 后端API路由
@app.route('/api/history', methods=['GET'])
def get_history():
    """获取历史数据"""
    # 分页参数
    page = int(request.args.get('page', 1))
    size = int(request.args.get('size', 10))
    
    # 生成历史数据
    records = generate_history_data()
    
    # 计算分页结果
    start = (page - 1) * size
    end = start + size
    paginated = records[start:end]
    
    return jsonify({
        "records": paginated,
        "total": len(records)
    })

@app.route('/api/analysis/<session_id>', methods=['GET'])
def get_analysis(session_id):
    """获取特定训练的分析数据"""
    try:
        # 这里只返回模拟数据，真实情况会根据session_id查询数据库
        return jsonify({
            "summary": "本次训练整体表现良好，步频保持稳定，姿态评分为85分。着地方式为中足着地，垂直振幅控制在适当范围内。建议关注足部外翻过度的问题，可通过特定练习改善。",
            "metrics": {
                "avgCadence": 172,
                "avgStride": 115,
                "postureScore": 85,
                "landingPattern": "中足着地",
                "verticalOscillation": 8.5,
                "groundContactTime": 220
            },
            "gaitAnalysis": {
                "description": "步态周期分析显示支撑相与摆动相比例适中，步态节奏均匀稳定。支撑相时间在理想范围内，摆动相展现出良好的弹性。",
                "supportPhase": "220毫秒 (38%)",
                "flightPhase": "360毫秒 (62%)"
            },
            "pressureAnalysis": {
                "description": "足压分布以中前脚掌为主，外侧压力略大。前脚掌受力占比45%，中脚掌占比30%，后脚掌占比25%，符合中足着地模式。",
                "forefoot": 45,
                "midfoot": 30,
                "rearfoot": 25
            },
            "recommendations": [
                {
                    "title": "改善足部外翻",
                    "description": "根据数据分析，您的足部在支撑相有轻微的外翻现象，长期可能导致胫骨内侧应力综合征。建议通过强化内侧肌群和改进着地技术来纠正。",
                    "exercises": [
                        "单腿平衡练习 (每侧30秒，3组)",
                        "内侧抗阻训练 (每侧15次，3组)",
                        "赤足短距离慢跑，注意足部感受"
                    ]
                },
                {
                    "title": "优化步频",
                    "description": "您的平均步频为172步/分钟，略低于最佳范围(175-185步/分钟)。提高步频可减少冲击力并改善跑步经济性。",
                    "exercises": [
                        "节拍器训练 (设置180BPM，跟随节奏跑步)",
                        "高抬腿练习 (30秒，4组)",
                        "短距离加速跑 (100米，专注于步频)"
                    ]
                }
            ]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 静态文件服务
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    """提供前端静态文件服务"""
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

# Socket.IO事件处理
@socketio.on('connect')
def handle_connect():
    """客户端连接事件"""
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    """客户端断开连接事件"""
    print('Client disconnected')

@socketio.on('start_collection')
def handle_start_collection(data):
    """开始数据采集"""
    is_real_sensor = data.get('isRealSensor', False)
    print(f'Start collection, real sensor: {is_real_sensor}')
    
    simulator.start()
    
    # 启动数据发送线程
    def send_data_thread():
        while simulator.is_running:
            data = simulator.get_current_data()
            if data:
                socketio.emit('sensor_data', data)
            socketio.sleep(0.1)  # 每100ms发送一次数据
    
    socketio.start_background_task(send_data_thread)
    
    return {'status': 'ok'}

@socketio.on('stop_collection')
def handle_stop_collection():
    """停止数据采集"""
    print('Stop collection')
    simulator.stop()
    return {'status': 'ok'}

@socketio.on('get_feedback')
def handle_get_feedback():
    """获取反馈数据"""
    feedback_types = ['success', 'warning', 'danger', 'info']
    feedback_messages = [
        '步频保持良好，维持在170-180步/分钟之间',
        '步幅略有偏短，可适当增加',
        '落地冲击力偏大，尝试更柔和的着地方式',
        '前后足压比例良好，保持当前姿态',
        '身体轻微左倾，注意保持身体平衡',
        '手臂摆动幅度过大，可适当收紧',
        '膝盖抬起高度适中，能量利用效率高',
        '支撑相时间偏长，可提高步频以改善',
        '足外翻角度过大，注意调整足部着地姿态'
    ]
    
    feedback_type = random.choice(feedback_types)
    feedback_message = random.choice(feedback_messages)
    now = datetime.now()
    timestamp = now.strftime('%H:%M:%S')
    
    return {
        'type': feedback_type,
        'message': feedback_message,
        'timestamp': timestamp
    }

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting server on port {port}...")
    socketio.run(app, host='0.0.0.0', port=port, debug=True, allow_unsafe_werkzeug=True)
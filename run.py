#!/usr/bin/env python
"""
中长跑实时指导系统启动脚本
此脚本用于简化系统的启动过程，包括环境检查、依赖安装和Web服务启动

功能说明:
- 检查Node.js和npm环境是否正确安装
- 启动Vue 3前端开发服务器
- 自动打开浏览器访问Web界面

系统架构:
- 前端: Vue 3, TypeScript, Element Plus, ECharts
- 后端: Python Flask, Socket.IO
- AI引擎: TensorFlow.js (边缘计算架构)

启动流程:
1. 检查开发环境
2. 启动前端开发服务器
3. 打开浏览器访问应用

推荐使用方法:
在项目根目录执行 `python run.py`
"""

import os
import sys
import subprocess
import webbrowser
import time
import platform

# 定义颜色常量
BLUE = '\033[94m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
RED = '\033[91m'
ENDC = '\033[0m'
BOLD = '\033[1m'

def print_banner():
    """打印启动横幅"""
    print(f"{BLUE}{BOLD}")
    print("==================================================")
    print("          中长跑实时指导系统启动工具            ")
    print("==================================================")
    print(f"{ENDC}")

def check_node_npm():
    """检查Node.js和npm是否安装"""
    print(f"{YELLOW}正在检查Node.js和npm环境...{ENDC}")
    
    try:
        # 在Windows系统上使用shell=True以确保命令能被正确执行
        if platform.system() == 'Windows':
            node_version = subprocess.check_output("node --version", 
                                                shell=True,
                                                stderr=subprocess.STDOUT).decode().strip()
            npm_version = subprocess.check_output("npm --version", 
                                               shell=True,
                                               stderr=subprocess.STDOUT).decode().strip()
        else:
            node_version = subprocess.check_output(["node", "--version"], 
                                                stderr=subprocess.STDOUT).decode().strip()
            npm_version = subprocess.check_output(["npm", "--version"], 
                                               stderr=subprocess.STDOUT).decode().strip()
        
        print(f"{GREEN}✓ Node.js版本: {node_version}{ENDC}")
        print(f"{GREEN}✓ npm版本: {npm_version}{ENDC}")
        return True
    except (subprocess.SubprocessError, FileNotFoundError) as e:
        print(f"{RED}✗ 未检测到Node.js或npm: {str(e)}{ENDC}")
        print(f"{YELLOW}请先安装Node.js: https://nodejs.org/{ENDC}")
        return False

def start_frontend():
    """启动前端应用"""
    print(f"{YELLOW}正在启动前端应用...{ENDC}")
    
    # 确定前端目录
    frontend_dir = os.path.dirname(os.path.abspath(__file__))
    
    try:
        # 启动开发服务器
        print(f"{BLUE}执行: npm run dev{ENDC}")
        
        # 使用Popen启动服务器，不阻塞当前进程
        if platform.system() == 'Windows':
            process = subprocess.Popen("npm run dev", 
                                    cwd=frontend_dir, 
                                    shell=True)
        else:
            process = subprocess.Popen("npm run dev", 
                                    cwd=frontend_dir, 
                                    shell=True, 
                                    executable='/bin/bash')
        
        # 等待服务器启动
        print(f"{YELLOW}等待服务器启动...{ENDC}")
        time.sleep(5)
        
        # 打开浏览器
        print(f"{YELLOW}正在打开浏览器...{ENDC}")
        webbrowser.open("http://localhost:5173")
        
        print(f"{GREEN}✓ 前端服务已启动，浏览器已打开{ENDC}")
        print(f"{BLUE}请访问: http://localhost:5173{ENDC}")
        print(f"{YELLOW}按 Ctrl+C 可停止服务{ENDC}")
        
        # 保持进程运行
        process.wait()
        
    except Exception as e:
        print(f"{RED}✗ 启动前端服务失败: {str(e)}{ENDC}")
        return False
    
    return True

def main():
    """主函数"""
    print_banner()
    
    # 检查环境
    if not check_node_npm():
        sys.exit(1)
    
    # 启动前端
    if not start_frontend():
        sys.exit(1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{YELLOW}用户中断，正在退出...{ENDC}")
        sys.exit(0)
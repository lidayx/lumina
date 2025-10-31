#!/bin/bash

# Linux 打包脚本

set -e

echo "====================================="
echo "🚀 开始打包 Linux 版本"
echo "====================================="

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

# 检查是否在 Linux 系统
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "⚠️  警告：当前不在 Linux 系统，某些功能可能不可用"
fi

# 检查是否有 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未找到 Node.js"
    echo "请先安装 Node.js: https://nodejs.org/"
    exit 1
fi

# 检查是否有依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 清理之前的构建
echo ""
echo "🧹 清理旧构建..."
rm -rf dist
rm -rf dist-electron


# 构建应用
echo ""
echo "🔨 构建应用..."
npm run build

# 打包 Linux 版本
echo ""
echo "📦 打包 Linux 版本..."
npm run build:linux

echo ""
echo "====================================="
echo "✅ Linux 打包完成！"
echo "====================================="
echo ""
echo "📦 输出文件在：dist/"
echo ""
echo "生成的文件："
ls -lh dist/* 2>/dev/null || echo "请检查 dist/ 目录"
echo ""


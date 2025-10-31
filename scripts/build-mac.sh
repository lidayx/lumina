#!/bin/bash

# macOS 打包脚本

set -e

echo "====================================="
echo "🚀 开始打包 macOS 版本"
echo "====================================="

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

# 检查是否在 macOS 系统
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "⚠️  警告：当前不在 macOS 系统"
    echo "⚠️  macOS 打包建议在 macOS 系统上进行"
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

# 检查是否有图标
if [ ! -f "build/icon.icns" ]; then
    echo "⚠️  警告：未找到 build/icon.icns"
    echo "💡 提示：运行 './scripts/generate-icon.sh' 生成图标"
    
    read -p "是否继续打包？(y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ 已取消"
        exit 1
    fi
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

# 打包 macOS 版本
echo ""
echo "📦 打包 macOS 版本..."
npm run build:mac

echo ""
echo "====================================="
echo "✅ macOS 打包完成！"
echo "====================================="
echo ""
echo "📦 输出文件在：dist/"
echo ""
echo "生成的文件："
ls -lh dist/*.dmg 2>/dev/null || ls -lh dist/*.pkg 2>/dev/null || echo "请检查 dist/ 目录"
echo ""


#!/bin/bash

# Windows 打包脚本

set -e

echo "====================================="
echo "🚀 开始打包 Windows 版本"
echo "====================================="

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
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
if [ ! -f "build/icon.ico" ]; then
    echo "⚠️  警告：未找到 build/icon.ico"
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

# 打包 Windows 版本
echo ""
echo "📦 打包 Windows 版本..."
npm run build:win

echo ""
echo "====================================="
echo "✅ Windows 打包完成！"
echo "====================================="
echo ""
echo "📦 输出文件在：dist/"
echo ""

# 查找并显示生成的文件
echo "生成的文件："
echo ""

# 查找安装包（Setup.exe）
INSTALLER=$(ls dist/*Setup*.exe 2>/dev/null | head -1)
if [ -n "$INSTALLER" ]; then
    echo "📦 安装包（推荐使用）："
    ls -lh "$INSTALLER"
    echo "   └─ 这是安装程序，双击后需要安装到系统"
    echo ""
fi

# 查找便携版（portable.exe）
PORTABLE=$(ls dist/*.exe 2>/dev/null | grep -v Setup | head -1)
if [ -n "$PORTABLE" ]; then
    echo "📁 便携版（可选）："
    ls -lh "$PORTABLE"
    echo "   └─ 这是便携版，可以直接双击运行（无需安装）"
    echo ""
fi

# 如果没有找到文件，列出所有 exe
if [ -z "$INSTALLER" ] && [ -z "$PORTABLE" ]; then
    echo "⚠️  未找到生成的文件，显示所有 exe 文件："
    ls -lh dist/*.exe 2>/dev/null || echo "   未找到任何 .exe 文件"
    echo ""
fi

echo "💡 提示：安装包文件名通常为 Lumina-Setup-*.exe"
echo ""


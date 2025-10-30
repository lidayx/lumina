#!/bin/bash

# macOS 自动构建并安装脚本
# 调用 build-mac.sh 构建应用，然后自动安装到 /Applications

set -e

echo "====================================="
echo "🚀 开始构建并安装 macOS 版本"
echo "====================================="

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

# 检查是否在 macOS 系统
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ 错误：此脚本只能在 macOS 系统上运行"
    exit 1
fi

# 获取脚本所在目录的父目录（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 切换到项目根目录
cd "$PROJECT_ROOT"

# 调用 build-mac.sh 完成构建（包括版本升级和打包）
echo ""
echo "📦 调用 build-mac.sh 进行构建..."
echo ""

# 调用构建脚本
bash "$SCRIPT_DIR/build-mac.sh"

# 注意：build-mac.sh 会清理 dist，所以我们需要在构建完成后查找 .app
# npm run build 会使用 --dir 模式生成 .app，但 build-mac.sh 中的 npm run build:mac 会再次构建
# 所以在 build-mac.sh 之后，.app 应该在 dist/mac-arm64/ 或 dist/mac/ 目录下

# 查找构建后的 .app 文件
# electron-builder --mac 会生成 .dmg，但 --dir 模式会生成 .app
# 我们先尝试从目录格式中查找（如果存在）
APP_PATH=""

echo ""
echo "🔍 查找构建后的应用..."

# 按优先级查找 .app 文件
if [ -d "dist/mac-arm64" ]; then
    APP_PATH=$(find dist/mac-arm64 -name "*.app" -type d | head -n 1)
    echo "   检查 dist/mac-arm64/ ..."
fi

if [ -z "$APP_PATH" ] && [ -d "dist/mac" ]; then
    APP_PATH=$(find dist/mac -name "*.app" -type d | head -n 1)
    echo "   检查 dist/mac/ ..."
fi

if [ -z "$APP_PATH" ] && [ -d "dist" ]; then
    APP_PATH=$(find dist -name "*.app" -type d -maxdepth 3 | head -n 1)
    echo "   检查 dist/ ..."
fi

# 如果仍然找不到，尝试从 .dmg 挂载并提取
if [ -z "$APP_PATH" ]; then
    echo "   未找到目录格式的 .app，尝试从 .dmg 提取..."
    
    DMG_FILE=$(find dist -name "*.dmg" -maxdepth 1 | head -n 1)
    if [ -n "$DMG_FILE" ]; then
        echo "   找到 .dmg 文件：$DMG_FILE"
        
        # 创建临时挂载点
        TEMP_MOUNT="/Volumes/Lumina_$(date +%s)"
        
        # 挂载 .dmg
        echo "   📂 挂载 .dmg..."
        hdiutil attach "$DMG_FILE" -mountpoint "$TEMP_MOUNT" -quiet
        
        # 查找 .app
        APP_PATH=$(find "$TEMP_MOUNT" -name "*.app" -type d | head -n 1)
        
        if [ -n "$APP_PATH" ]; then
            # 创建临时目录存放 .app
            TEMP_APP_DIR="/tmp/lumina_app_$(date +%s)"
            mkdir -p "$TEMP_APP_DIR"
            cp -R "$APP_PATH" "$TEMP_APP_DIR/"
            APP_PATH="$TEMP_APP_DIR/$(basename "$APP_PATH")"
            
            # 卸载 .dmg
            hdiutil detach "$TEMP_MOUNT" -quiet
            echo "   ✅ 已从 .dmg 提取 .app"
        else
            # 卸载 .dmg
            hdiutil detach "$TEMP_MOUNT" -quiet 2>/dev/null || true
        fi
    fi
fi

if [ -z "$APP_PATH" ]; then
    echo ""
    echo "❌ 错误：未找到构建后的 .app 文件"
    echo "💡 提示：请检查 dist/ 目录，或确保构建成功完成"
    exit 1
fi

echo ""
echo "✅ 找到应用：$APP_PATH"

# 获取应用名称（确保路径是绝对路径）
APP_PATH=$(cd "$(dirname "$APP_PATH")" && pwd)/$(basename "$APP_PATH")
APP_NAME=$(basename "$APP_PATH")
APPLICATIONS_PATH="/Applications/$APP_NAME"

echo "   应用名称：$APP_NAME"

echo ""
echo "📦 准备安装到：$APPLICATIONS_PATH"

# 检查应用是否已存在
if [ -d "$APPLICATIONS_PATH" ]; then
    echo ""
    echo "⚠️  应用已存在于 /Applications/"
    read -p "是否替换现有应用？(y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ 已取消安装"
        exit 0
    fi
    
    # 删除旧应用
    echo "🗑️  删除旧应用..."
    rm -rf "$APPLICATIONS_PATH"
fi

# 复制应用到 Applications
echo ""
echo "📥 正在安装应用到 /Applications/..."
sudo cp -R "$APP_PATH" "$APPLICATIONS_PATH"

# 修复权限（确保应用可执行）
echo "🔧 修复应用权限..."
sudo chown -R $(whoami) "$APPLICATIONS_PATH"
chmod -R 755 "$APPLICATIONS_PATH"

# 清理 quarantine 属性（避免首次打开时的安全提示）
echo "🔓 移除隔离属性..."
xattr -d com.apple.quarantine "$APPLICATIONS_PATH" 2>/dev/null || true

# 清理临时文件（如果在 /tmp 中）
if [[ "$APP_PATH" == /tmp/* ]]; then
    echo "🧹 清理临时文件..."
    rm -rf "$(dirname "$APP_PATH")"
fi

echo ""
echo "====================================="
echo "✅ 安装完成！"
echo "====================================="
echo ""
echo "📱 应用已安装到：$APPLICATIONS_PATH"
echo ""
echo "💡 提示："
echo "   - 可以通过 Spotlight (Cmd+Space) 搜索 \"Lumina\" 打开应用"
echo "   - 或在 Launchpad 中找到应用"
echo ""


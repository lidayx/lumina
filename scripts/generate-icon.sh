#!/bin/bash

# 生成应用图标脚本

echo "生成应用图标..."

# 创建图标目录
mkdir -p build

# 将build/lumina.svg转换为png
if [ -f "build/lumina.svg" ]; then
    echo "从 SVG 转换图标（保留透明度）..."
    # 优先使用 rsvg-convert，它最好地支持透明度和渐变
    if command -v rsvg-convert > /dev/null; then
        echo "使用 rsvg-convert 转换..."
        rsvg-convert -w 1024 -h 1024 --background-color=none build/lumina.svg > build/icon.png
    # 备选：使用 Inkscape
    elif command -v inkscape > /dev/null; then
        echo "使用 Inkscape 转换..."
        inkscape --export-type=png \
                 --export-width=1024 \
                 --export-height=1024 \
                 --export-background-opacity=0 \
                 build/lumina.svg \
                 --export-filename=build/icon.png
    # 备选：使用 ImageMagick（需要特定配置）
    elif command -v magick > /dev/null; then
        echo "使用 ImageMagick 转换（可能效果不佳）..."
        magick -background none build/lumina.svg -resize 1024x1024 build/icon.png
    else
        echo "⚠ 未找到合适的转换工具"
        echo "请安装其中一个："
        echo "  brew install librsvg    (推荐)"
        echo "  或: brew install inkscape"
        exit 1
    fi
else
    echo "未找到 build/lumina.svg，跳过 SVG 转换"
fi

# 检查是否有 icon.png
if [ ! -f "build/icon.png" ]; then
    echo "未找到 build/icon.png"
    echo "请将你的图标文件（512x512 PNG）保存为 build/icon.png"
    echo "或者使用以下命令创建一个占位图标："
    echo ""
    echo "  sips -s format png -z 512 512 /System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/AlertStopIcon.icns --out build/icon.png"
    exit 1
fi

echo "✓ 找到图标文件：build/icon.png"

# 为 macOS 生成 .icns
if command -v iconutil > /dev/null; then
    echo "为 macOS 生成 icon.icns..."
    mkdir -p build/mac.iconset
    
    # 生成不同尺寸的图标
    sips -z 16 16   build/icon.png --out build/mac.iconset/icon_16x16.png
    sips -z 32 32   build/icon.png --out build/mac.iconset/icon_16x16@2x.png
    sips -z 32 32   build/icon.png --out build/mac.iconset/icon_32x32.png
    sips -z 64 64   build/icon.png --out build/mac.iconset/icon_32x32@2x.png
    sips -z 128 128 build/icon.png --out build/mac.iconset/icon_128x128.png
    sips -z 256 256 build/icon.png --out build/mac.iconset/icon_128x128@2x.png
    sips -z 256 256 build/icon.png --out build/mac.iconset/icon_256x256.png
    sips -z 512 512 build/icon.png --out build/mac.iconset/icon_256x256@2x.png
    sips -z 512 512 build/icon.png --out build/mac.iconset/icon_512x512.png
    
    # 生成 .icns
    iconutil -c icns build/mac.iconset --output build/icon.icns
    rm -rf build/mac.iconset
    
    echo "✓ macOS 图标已生成：build/icon.icns"
else
    echo "⚠ 未找到 iconutil，跳过 .icns 生成"
fi

# 为 Windows 生成 .ico
if command -v magick > /dev/null; then
    echo "为 Windows 生成 icon.ico..."
    magick convert build/icon.png -define icon:auto-resize=256,128,64,48,32,16 build/icon.ico
    echo "✓ Windows 图标已生成：build/icon.ico"
else
    echo "⚠ 未找到 ImageMagick，跳过 .ico 生成（Windows 用户需手动转换）"
fi

echo ""
echo "✅ 图标生成完成！"
echo ""
echo "生成的文件："
ls -lh build/icon.* | awk '{print "  " $9 " (" $5 ")"}'


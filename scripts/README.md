# 打包脚本说明

本目录包含用于不同平台的打包脚本。

## 脚本列表

### 1. `generate-icon.sh` - 生成应用图标

生成 macOS (.icns) 和 Windows (.ico) 图标文件。

**使用方法：**
```bash
./scripts/generate-icon.sh
```

**前置条件：**
- 需要 `build/icon.png` 文件（512x512 PNG 格式）
- macOS 需要 `sips` 命令（系统自带）
- Windows 图标需要 `ImageMagick`（可选）

### 2. `build-windows.sh` - 打包 Windows 版本

构建 Windows 安装包 (.exe)。

**使用方法：**
```bash
./scripts/build-windows.sh
```

**输出：**
- `dist/electron-quick-Setup.exe` - Windows 安装程序

### 3. `build-mac.sh` - 打包 macOS 版本

构建 macOS 应用包 (.app, .dmg)。

**使用方法：**
```bash
./scripts/build-mac.sh
```

**输出：**
- `dist/Lumina-*.dmg` - macOS 磁盘映像
- `dist/mac-arm64/Lumina.app` - macOS 应用包（目录格式）

### 4. `install-mac.sh` - 自动构建并安装到 Applications

自动调用 `build-mac.sh` 构建应用，然后将 `.app` 安装到 `/Applications/` 目录。

**使用方法：**
```bash
./scripts/install-mac.sh
```

**功能：**
- 自动调用 `build-mac.sh` 进行构建（包括版本升级）
- 自动查找构建后的 `.app` 文件
- 如果找不到 `.app`，会尝试从 `.dmg` 中提取
- 询问是否替换已存在的应用
- 自动设置正确的权限
- 移除 quarantine 属性（避免首次打开的安全提示）

**注意事项：**
- 需要管理员权限（sudo）来写入 `/Applications/` 目录
- 首次运行时可能需要输入密码
- 如果应用已存在，会询问是否替换

### 5. `build-linux.sh` - 打包 Linux 版本

构建 Linux 应用包 (.AppImage, .deb, .rpm)。

**使用方法：**
```bash
./scripts/build-linux.sh
```

**输出：**
- `dist/electron-quick.AppImage` - AppImage 格式
- `dist/electron-quick.deb` - Debian 包
- `dist/electron-quick.rpm` - RPM 包

### 6. `build-all.sh` - 打包所有平台

一次性构建 Windows、macOS 和 Linux 版本。

**使用方法：**
```bash
./scripts/build-all.sh
```

## 快速开始

### 1. 准备图标

首先生成应用图标：

```bash
# 如果没有图标，可以先创建一个占位图标
sips -s format png -z 512 512 /System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/AlertStopIcon.icns --out build/icon.png

# 或使用自己的图标
# 将 512x512 的 PNG 图标保存为 build/icon.png

# 生成图标
./scripts/generate-icon.sh
```

### 2. 打包应用

**Windows：**
```bash
./scripts/build-windows.sh
```

**macOS：**
```bash
# 仅打包
./scripts/build-mac.sh

# 打包并自动安装到 Applications
./scripts/install-mac.sh
```

**Linux：**
```bash
./scripts/build-linux.sh
```

**所有平台：**
```bash
./scripts/build-all.sh
```

## 注意事项

1. **Windows 打包**：
   - 需要在 Windows 系统或支持 Wine 的环境
   - 建议在 CI/CD 环境中进行 Windows 打包

2. **macOS 打包**：
   - 需要在 macOS 系统上进行
   - 可能需要开发者证书签名

3. **Linux 打包**：
   - 可以在任何支持 Docker 的系统上打包
   - `.deb` 和 `.rpm` 包需要在对应的系统上生成

4. **图标要求**：
   - 基础图标：`build/icon.png` (512x512)
   - macOS: `build/icon.icns`
   - Windows: `build/icon.ico`

## 故障排除

### 找不到图标文件
```bash
# 生成图标
./scripts/generate-icon.sh
```

### Node.js 未安装
```bash
# 安装 Node.js
# macOS/Linux
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# 或使用 Homebrew (macOS)
brew install node
```

### 权限问题
```bash
# 给脚本添加执行权限
chmod +x scripts/*.sh
```

### Windows 上运行脚本
在 Windows 上可以使用 Git Bash、WSL 或直接使用 npm 命令：
```bash
npm run build:win
```

## 相关链接

- [electron-builder 文档](https://www.electron.build/)
- [electron-builder 配置](../electron-builder.yml)
- [项目文档](../docs/)


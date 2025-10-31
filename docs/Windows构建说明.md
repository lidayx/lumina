# Windows 构建说明

## 构建输出文件类型

Windows 构建会生成两种类型的文件：

### 1. 安装包（NSIS Installer）- 推荐

**文件名格式：** `lumina-Setup-{version}.exe`

**特点：**
- ✅ 完整的安装向导界面
- ✅ 允许选择安装目录
- ✅ 自动创建桌面快捷方式
- ✅ 自动创建开始菜单快捷方式
- ✅ 可通过"程序和功能"卸载
- ✅ 安装完成后可自动运行应用

**使用方法：**
1. 双击 `lumina-Setup-{version}.exe`
2. 按照安装向导提示操作
3. 选择安装目录（默认：`C:\Users\{用户名}\AppData\Local\Programs\lumina`）
4. 等待安装完成
5. 可以选择立即运行应用

**卸载方法：**
- 控制面板 → 程序和功能 → 找到 "Lumina" → 卸载
- 或：开始菜单 → Lumina → 卸载

### 2. 便携版（Portable）

**文件名格式：** `lumina-Portable-{version}.exe`

**特点：**
- ✅ 无需安装，直接运行
- ✅ 不写入注册表
- ✅ 不创建系统快捷方式
- ✅ 适合临时使用或U盘携带
- ⚠️ 数据存储在exe同目录，需手动管理

**使用方法：**
1. 将 `lumina-Portable-{version}.exe` 解压到任意目录
2. 双击 `lumina.exe` 即可运行
3. 应用数据会保存在exe同目录下的 `data` 文件夹中

## 构建命令

### 生成所有版本（默认）

同时生成安装包和便携版：

```bash
npm run build:win
```

或使用脚本：

```bash
./scripts/build-windows.sh
```

**输出文件：**
- `dist/lumina-Setup-{version}.exe` - 安装包
- `dist/lumina-Portable-{version}.exe` - 便携版

### 仅生成安装包

```bash
npm run build:win:installer
```

**输出文件：**
- `dist/lumina-Setup-{version}.exe` - 安装包

### 仅生成便携版

```bash
npm run build:win:portable
```

**输出文件：**
- `dist/lumina-Portable-{version}.exe` - 便携版

## 配置文件说明

Windows 构建配置在 `electron-builder.yml` 中：

```yaml
win:
  target:
    - nsis      # NSIS 安装包
    - portable  # 便携版

nsis:
  oneClick: false                           # 非一键安装（显示向导）
  allowToChangeInstallationDirectory: true  # 允许选择安装目录
  createDesktopShortcut: true               # 创建桌面快捷方式
  createStartMenuShortcut: true             # 创建开始菜单快捷方式
  runAfterFinish: true                      # 安装完成后运行

portable:
  artifactName: ${name}-Portable-${version}.${ext}
```

## 安装包特性

### NSIS 安装程序功能

1. **安装向导**
   - 欢迎界面
   - 许可协议（如需要）
   - 安装路径选择
   - 开始菜单快捷方式选项
   - 桌面快捷方式选项
   - 安装进度显示
   - 完成界面（可选立即运行）

2. **安装位置**
   - 默认：`C:\Users\{用户名}\AppData\Local\Programs\lumina`
   - 用户可自定义到任意目录

3. **快捷方式**
   - 桌面快捷方式（可选）
   - 开始菜单快捷方式（可选）
   - 快速启动栏（可选，Windows 10+）

4. **卸载程序**
   - 通过"程序和功能"卸载
   - 支持完全卸载（可选择是否删除用户数据）

## 对比：安装包 vs 便携版

| 特性 | 安装包 | 便携版 |
|------|--------|--------|
| 安装方式 | 需要安装向导 | 无需安装，直接运行 |
| 注册表 | 写入少量注册表项 | 不写入 |
| 快捷方式 | 自动创建 | 需手动创建 |
| 卸载方式 | 通过控制面板 | 直接删除文件 |
| 更新方式 | 运行新安装包覆盖 | 替换文件 |
| 系统集成 | 完整集成 | 无集成 |
| 适用场景 | 长期使用 | 临时使用、U盘携带 |
| 用户数据位置 | `%APPDATA%\lumina` | exe 同目录 |

## 推荐使用场景

### 使用安装包（推荐）的场景：
- ✅ 普通用户日常使用
- ✅ 需要自动更新功能
- ✅ 需要系统级集成（快捷方式、右键菜单等）
- ✅ 多用户共享电脑

### 使用便携版的场景：
- ✅ 临时使用，不想安装
- ✅ U盘携带，多台电脑使用
- ✅ 企业环境限制安装权限
- ✅ 测试新版本而不影响已安装版本

## 注意事项

1. **图标文件**
   - 需要 `build/icon.ico` 文件
   - 可通过 `npm run generate:icon` 生成
   - 在 macOS 上交叉构建 Windows 时，图标可能需要 Wine 支持

2. **代码签名**
   - 当前配置跳过了代码签名（`sign: null`）
   - 正式发布建议使用有效的代码签名证书
   - 未签名的安装包可能在 Windows 上显示安全警告

3. **构建环境**
   - 在 Windows 上构建：直接运行即可
   - 在 macOS/Linux 上交叉构建：需要安装 Wine（可选）
   - 推荐在 Windows 环境或 CI/CD 中构建 Windows 版本

4. **文件大小**
   - 安装包：约 100-200MB（包含所有依赖）
   - 便携版：约 100-200MB（与安装包相同）
   - 两者都包含完整的 Electron 运行时

## 故障排除

### 问题：只生成了便携版，没有安装包

**解决方案：**
检查 `electron-builder.yml` 中 `win.target` 是否包含 `nsis`：

```yaml
win:
  target:
    - nsis      # 确保包含这行
    - portable
```

### 问题：安装包名称不正确

**解决方案：**
检查 `electron-builder.yml` 中的 `artifactName` 配置：

```yaml
win:
  artifactName: ${name}-Setup-${version}.${ext}
```

### 问题：安装后无法创建快捷方式

**解决方案：**
1. 检查是否有管理员权限
2. 检查 `nsis.createDesktopShortcut` 和 `nsis.createStartMenuShortcut` 是否设置为 `true`

### 问题：在 macOS 上构建 Windows 版本失败

**解决方案：**
1. 安装 Wine（可选，用于图标处理）
2. 或使用 GitHub Actions / CI/CD 在 Windows 环境中构建
3. 或直接在 Windows 系统上构建

---

*最后更新：2024年*


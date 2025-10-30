#!/usr/bin/env node

/**
 * 自动升级版本号脚本
 * 使用方法：
 *   npm run version:patch  # 升级补丁版本 (1.0.0 -> 1.0.1)
 *   npm run version:minor  # 升级次版本 (1.0.0 -> 1.1.0)
 *   npm run version:major  # 升级主版本 (1.0.0 -> 2.0.0)
 */

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '../package.json');

function bumpVersion(type) {
  // 读取 package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const currentVersion = packageJson.version;
  
  // 解析版本号 (major.minor.patch)
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  let newVersion;
  switch (type) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
    default:
      console.error('❌ 无效的版本类型。请使用: major, minor, 或 patch');
      process.exit(1);
  }
  
  // 更新版本号
  packageJson.version = newVersion;
  
  // 写入 package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  
  console.log(`✅ 版本号已更新: ${currentVersion} -> ${newVersion}`);
  return newVersion;
}

// 获取命令行参数
const type = process.argv[2];

if (!type) {
  console.log(`
📦 Lumina 版本管理工具

使用方法:
  npm run version:patch  # 升级补丁版本 (1.0.0 -> 1.0.1)
  npm run version:minor  # 升级次版本 (1.0.0 -> 1.1.0)
  npm run version:major  # 升级主版本 (1.0.0 -> 2.0.0)

或者直接运行:
  node scripts/bump-version.js [patch|minor|major]
  `);
  process.exit(0);
}

bumpVersion(type);


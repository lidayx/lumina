export interface AppInfo {
  id: string; // 应用唯一标识
  name: string; // 应用名称
  path: string; // 应用路径
  icon?: string; // 应用图标路径
  description?: string; // 应用描述
  category?: string; // 应用分类
  launchCount: number; // 启动次数
  lastUsed: Date; // 最后使用时间
}

export interface AppService {
  getAllApps(): Promise<AppInfo[]>;
  launchApp(appId: string): Promise<void>;
  indexApps(): Promise<void>;
}

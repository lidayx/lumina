/**
 * 浏览器配置接口
 */
export interface BrowserConfig {
  id: string;
  name: string;
  path: string; // 浏览器可执行文件路径
  isDefault: boolean;
  icon?: string; // 浏览器图标路径或 base64
  homepage?: string; // 浏览器首页/书签地址（选填）
}


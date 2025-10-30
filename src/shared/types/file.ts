/**
 * 文件信息接口
 */
export interface FileInfo {
  id: string; // 文件唯一标识
  name: string; // 文件名
  path: string; // 完整路径
  type: 'file' | 'folder'; // 类型
  extension?: string; // 扩展名
  size: number; // 大小（字节）
  modified: Date; // 修改时间
  indexedAt: Date; // 索引时间
}


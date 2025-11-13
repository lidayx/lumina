/**
 * IP 网络信息服务
 * 支持获取内网IP、外网IP、网关、DNS等信息
 */

import { networkInterfaces } from 'os';
import * as dns from 'dns';
import * as https from 'https';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ========== 类型定义 ==========

export interface IpResult {
  input: string;
  output: string;
  success: boolean;
  error?: string;
  outputs?: string[]; // 用于返回多个结果（多个网络信息）
  isMultiple?: boolean; // 标识是否为多个结果
}

/**
 * IP 网络信息服务类
 */
class IpService {
  /**
   * 处理 IP 查询
   * 当输入为 "ip" 时，返回网络信息
   */
  public handleIpQuery(query: string): IpResult | null {
    try {
      const trimmedQuery = query.trim().toLowerCase();
      
      // 检测 IP 查询：ip、IP、查看ip、网络信息等
      const ipPattern = /^ip$|^查看ip$|^网络信息$|^network$|^ipinfo$/i;
      if (!ipPattern.test(trimmedQuery)) {
        return null;
      }

      // 获取网络信息
      const networkInfo = this.getNetworkInfo();
      
      if (networkInfo.length === 0) {
        return {
          input: query,
          output: '无法获取网络信息',
          success: false,
          error: '无法获取网络信息',
        };
      }

      return {
        input: query,
        output: networkInfo[0], // 第一个信息作为主输出（向后兼容）
        outputs: networkInfo, // 所有网络信息
        success: true,
        isMultiple: true, // 标识为多个结果
      };
    } catch (error: any) {
      console.error(`❌ [IP服务] 处理失败: ${error.message}`);
      const errorMsg = error.message || '获取网络信息错误';
      return {
        input: query,
        output: errorMsg,
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * 获取网络信息
   * 返回内网IP、外网IP、网关、DNS等信息
   */
  private getNetworkInfo(): string[] {
    const info: string[] = [];
    
    try {
      // 获取内网IP地址
      const interfaces = networkInterfaces();
      const localIps: string[] = [];
      
      for (const name of Object.keys(interfaces)) {
        const nets = interfaces[name];
        if (!nets) continue;
        
        for (const net of nets) {
          // 跳过内部（回环）地址和非IPv4地址
          if (net.family === 'IPv4' && !net.internal) {
            localIps.push(`${name}: ${net.address}`);
          }
        }
      }
      
      if (localIps.length > 0) {
        // 添加内网IP（取第一个非回环地址）
        const mainIp = localIps[0].split(': ')[1];
        info.push(`内网IP: ${mainIp}`);
        
        // 如果有多个网卡，添加其他内网IP
        if (localIps.length > 1) {
          for (let i = 1; i < localIps.length; i++) {
            info.push(localIps[i]);
          }
        }
      } else {
        info.push('内网IP: 未找到');
      }

      // 获取网关（同步版本无法获取，将在异步版本中获取）
      info.push('网关: 获取中...');

      // 获取DNS服务器
      const dnsServers = this.getDnsServers();
      if (dnsServers.length > 0) {
        info.push(`DNS: ${dnsServers.join(', ')}`);
      } else {
        info.push('DNS: 未找到');
      }

      // 获取外网IP（异步获取，这里先返回占位符）
      info.push('外网IP: 查询中...');
      
      // 异步获取外网IP（不阻塞返回）
      this.getPublicIp()
        .then(publicIp => {
          if (publicIp) {
            // 通过事件或回调更新（这里先简化处理）
            console.log(`🌐 [IP服务] 外网IP: ${publicIp}`);
          }
        })
        .catch(err => {
          console.error(`❌ [IP服务] 获取外网IP失败: ${err.message}`);
        });
      
    } catch (error: any) {
      console.error(`❌ [IP服务] 获取网络信息失败: ${error.message}`);
      info.push(`错误: ${error.message}`);
    }
    
    return info;
  }

  /**
   * 获取默认网关（通过系统命令）
   */
  private async getDefaultGateway(): Promise<string | null> {
    try {
      const platform = process.platform;
      
      if (platform === 'darwin') {
        // macOS: 使用 netstat -nr 获取默认网关
        try {
          const { stdout } = await execAsync('netstat -nr | grep default');
          const lines = stdout.trim().split('\n');
          if (lines.length > 0) {
            // 解析第一行的默认路由
            const parts = lines[0].trim().split(/\s+/);
            if (parts.length >= 2) {
              const gateway = parts[1];
              if (this.isValidIp(gateway)) {
                return gateway;
              }
            }
          }
        } catch (error) {
          // netstat 失败，尝试其他方法
        }
      } else if (platform === 'linux') {
        // Linux: 使用 ip route 获取默认网关
        try {
          const { stdout } = await execAsync('ip route | grep default');
          const match = stdout.match(/default via ([0-9.]+)/);
          if (match && match[1]) {
            return match[1];
          }
        } catch (error) {
          // ip route 失败，尝试 route 命令
          try {
            const { stdout } = await execAsync('route -n | grep "^0.0.0.0"');
            const parts = stdout.trim().split(/\s+/);
            if (parts.length >= 2) {
              const gateway = parts[1];
              if (this.isValidIp(gateway)) {
                return gateway;
              }
            }
          } catch (error) {
            // 所有方法都失败
          }
        }
      } else if (platform === 'win32') {
        // Windows: 使用 ipconfig 获取默认网关
        try {
          const { stdout } = await execAsync('ipconfig | findstr /i "Default Gateway"');
          const match = stdout.match(/Default Gateway[.\s]+:\s+([0-9.]+)/i);
          if (match && match[1]) {
            return match[1];
          }
        } catch (error) {
          // ipconfig 失败
        }
      }
      
      // 如果系统命令失败，使用简化方法：从网络接口推断
      const interfaces = networkInterfaces();
      for (const name of Object.keys(interfaces)) {
        const nets = interfaces[name];
        if (!nets) continue;
        
        for (const net of nets) {
          if (net.family === 'IPv4' && !net.internal) {
            const parts = net.address.split('.');
            if (parts.length === 4) {
              // 假设网关是网络地址的最后一个字节为1
              return `${parts[0]}.${parts[1]}.${parts[2]}.1`;
            }
          }
        }
      }
    } catch (error: any) {
      console.error(`❌ [IP服务] 获取网关失败: ${error.message}`);
    }
    
    return null;
  }

  /**
   * 获取DNS服务器
   */
  private getDnsServers(): string[] {
    try {
      // 在 Node.js 中，可以通过 dns.getServers() 获取
      const servers = dns.getServers();
      return servers.length > 0 ? servers : [];
    } catch (error: any) {
      console.error(`❌ [IP服务] 获取DNS服务器失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 获取外网IP（通过外部API，使用Node.js的https模块）
   */
  private async getPublicIp(): Promise<string | null> {
    // 使用多个API作为备选
    const apis = [
      { hostname: 'api.ipify.org', path: '/' },
      { hostname: 'ifconfig.me', path: '/ip' },
      { hostname: 'api.ip.sb', path: '/ip' },
      { hostname: 'icanhazip.com', path: '/' },
    ];

    for (const api of apis) {
      try {
        const ip = await this.fetchPublicIp(api.hostname, api.path);
        if (ip && this.isValidIp(ip)) {
          return ip;
        }
      } catch (error) {
        // 尝试下一个API
        continue;
      }
    }
    
    return null;
  }

  /**
   * 使用https模块获取外网IP
   */
  private async fetchPublicIp(hostname: string, path: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname,
        path,
        method: 'GET',
        timeout: 3000,
        headers: {
          'Accept': 'text/plain',
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(data.trim());
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  /**
   * 验证IP地址格式
   */
  private isValidIp(ip: string): boolean {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
      return false;
    }
    
    const parts = ip.split('.');
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }

  /**
   * 获取网络信息（异步版本，包含外网IP）
   */
  public async getNetworkInfoAsync(): Promise<string[]> {
    const info: string[] = [];
    
    try {
      // 获取内网IP地址
      const interfaces = networkInterfaces();
      const localIps: string[] = [];
      
      for (const name of Object.keys(interfaces)) {
        const nets = interfaces[name];
        if (!nets) continue;
        
        for (const net of nets) {
          if (net.family === 'IPv4' && !net.internal) {
            localIps.push(`${name}: ${net.address}`);
          }
        }
      }
      
      if (localIps.length > 0) {
        const mainIp = localIps[0].split(': ')[1];
        info.push(`内网IP: ${mainIp}`);
        
        // 如果有多个网卡，添加其他内网IP
        if (localIps.length > 1) {
          for (let i = 1; i < localIps.length; i++) {
            info.push(localIps[i]);
          }
        }
      } else {
        info.push('内网IP: 未找到');
      }

      // 获取网关（异步）
      try {
        const gateway = await this.getDefaultGateway();
        if (gateway) {
          info.push(`网关: ${gateway}`);
        } else {
          info.push('网关: 未找到');
        }
      } catch (error: any) {
        info.push('网关: 获取失败');
      }

      // 获取DNS服务器
      const dnsServers = this.getDnsServers();
      if (dnsServers.length > 0) {
        info.push(`DNS: ${dnsServers.join(', ')}`);
      } else {
        info.push('DNS: 未找到');
      }

      // 获取外网IP（异步，可能需要较长时间）
      try {
        const publicIp = await Promise.race([
          this.getPublicIp(),
          new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 5000)),
        ]);
        if (publicIp) {
          info.push(`外网IP: ${publicIp}`);
        } else {
          info.push('外网IP: 获取失败或超时');
        }
      } catch (error: any) {
        info.push('外网IP: 获取失败');
      }
      
    } catch (error: any) {
      console.error(`❌ [IP服务] 获取网络信息失败: ${error.message}`);
      info.push(`错误: ${error.message}`);
    }
    
    return info;
  }

  /**
   * 处理 IP 查询（异步版本）
   */
  public async handleIpQueryAsync(query: string): Promise<IpResult | null> {
    try {
      const trimmedQuery = query.trim().toLowerCase();
      
      const ipPattern = /^ip$|^查看ip$|^网络信息$|^network$|^ipinfo$/i;
      if (!ipPattern.test(trimmedQuery)) {
        return null;
      }

      // 获取网络信息（包含外网IP）
      const networkInfo = await this.getNetworkInfoAsync();
      
      if (networkInfo.length === 0) {
        return {
          input: query,
          output: '无法获取网络信息',
          success: false,
          error: '无法获取网络信息',
        };
      }

      return {
        input: query,
        output: networkInfo[0],
        outputs: networkInfo,
        success: true,
        isMultiple: true,
      };
    } catch (error: any) {
      console.error(`❌ [IP服务] 处理失败: ${error.message}`);
      const errorMsg = error.message || '获取网络信息错误';
      return {
        input: query,
        output: errorMsg,
        success: false,
        error: errorMsg,
      };
    }
  }
}

export const ipService = new IpService();


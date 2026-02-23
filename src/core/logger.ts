import type { Logger } from './plugin-interface.js';

// 创建日志器
export function createLogger(prefix: string): Logger {
  return {
    info(message: string, ...args: unknown[]) {
      console.log(`[${prefix}] ℹ️ ${message}`, ...args);
    },
    warn(message: string, ...args: unknown[]) {
      console.warn(`[${prefix}] ⚠️ ${message}`, ...args);
    },
    error(message: string, ...args: unknown[]) {
      console.error(`[${prefix}] ❌ ${message}`, ...args);
    },
    debug(message: string, ...args: unknown[]) {
      if (process.env.DEBUG === 'true') {
        console.debug(`[${prefix}] 🐛 ${message}`, ...args);
      }
    },
  };
}

// 默认日志器
export const logger = createLogger('Core');

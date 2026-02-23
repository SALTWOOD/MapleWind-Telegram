import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// 加载 .env 文件
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface SslConfig {
  enabled: boolean;
  certPath: string;
  keyPath: string;
  cert?: string;
  key?: string;
}

export interface PluginConfig {
  enabled: string[];
}

export interface Config {
  telegram: {
    botToken: string;
  };
  github: {
    appId: string;
    privateKey: string;
    clientId: string;
    clientSecret: string;
  };
  oauth: {
    redirectUrl: string;
  };
  webhook: {
    secret: string;
    port: number;
  };
  database: {
    url: string;
  };
  server: {
    url: string;
  };
  ssl: SslConfig;
  plugins: PluginConfig;
}

function getEnv(key: string, required: boolean = true): string {
  const value = process.env[key];
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || '';
}

function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (!value) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Missing required environment variable: ${key}`);
  }
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new Error(`Environment variable ${key} must be a number`);
  }
  return num;
}

function getEnvBool(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key];
  if (!value) {
    return defaultValue;
  }
  return value.toLowerCase() === 'true' || value === '1';
}

function loadSslConfig(): SslConfig {
  const enabled = getEnvBool('SSL_ENABLED', false);
  const certPath = getEnv('SSL_CERT_PATH', false);
  const keyPath = getEnv('SSL_KEY_PATH', false);
  
  const sslConfig: SslConfig = {
    enabled,
    certPath,
    keyPath,
  };
  
  if (enabled && certPath && keyPath) {
    try {
      sslConfig.cert = fs.readFileSync(certPath, 'utf8');
      sslConfig.key = fs.readFileSync(keyPath, 'utf8');
    } catch (error) {
      console.error('Failed to load SSL certificates:', error);
      sslConfig.enabled = false;
    }
  }
  
  return sslConfig;
}

export const config: Config = {
  telegram: {
    botToken: getEnv('TELEGRAM_BOT_TOKEN'),
  },
  github: {
    appId: getEnv('GITHUB_APP_ID'),
    privateKey: getEnv('GITHUB_APP_PRIVATE_KEY').replace(/\\n/g, '\n'),
    clientId: getEnv('GITHUB_APP_CLIENT_ID'),
    clientSecret: getEnv('GITHUB_APP_CLIENT_SECRET'),
  },
  oauth: {
    redirectUrl: getEnv('OAUTH_REDIRECT_URL'),
  },
  webhook: {
    secret: getEnv('WEBHOOK_SECRET'),
    port: getEnvNumber('WEBHOOK_PORT', 3000),
  },
  database: {
    url: getEnv('DATABASE_URL'),
  },
  server: {
    url: getEnv('SERVER_URL'),
  },
  ssl: loadSslConfig(),
  plugins: {
    enabled: getEnv('ENABLED_PLUGINS', false)
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0),
  },
};

export default config;

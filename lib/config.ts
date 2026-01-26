/**
 * Application Configuration
 * Centralized configuration management with environment variable validation
 */

export interface AppConfig {
  env: 'development' | 'production' | 'test';
  port: number;
  database: {
    url: string;
    minConnections: number;
    maxConnections: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  storage: {
    type: 'local' | 's3';
    path?: string;
    s3?: {
      bucket: string;
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
    };
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
  };
  superAdmin: {
    username: string;
    password: string;
    email: string;
  };
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvVarOptional(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue;
}

export const config: AppConfig = {
  env: (process.env.NODE_ENV as AppConfig['env']) || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  
  database: {
    url: getEnvVar('DATABASE_URL'),
    minConnections: 2,
    maxConnections: 10,
  },
  
  jwt: {
    secret: getEnvVar('JWT_SECRET'),
    expiresIn: '24h',
  },
  
  storage: {
    type: (process.env.STORAGE_TYPE as 'local' | 's3') || 'local',
    path: getEnvVarOptional('STORAGE_PATH', './uploads'),
    s3: process.env.STORAGE_TYPE === 's3' ? {
      bucket: getEnvVar('S3_BUCKET'),
      region: getEnvVar('S3_REGION'),
      accessKeyId: getEnvVar('S3_ACCESS_KEY_ID'),
      secretAccessKey: getEnvVar('S3_SECRET_ACCESS_KEY'),
    } : undefined,
  },
  
  logging: {
    level: (process.env.LOG_LEVEL as AppConfig['logging']['level']) || 'info',
  },
  
  superAdmin: {
    username: getEnvVar('SUPER_ADMIN_USERNAME'),
    password: getEnvVar('SUPER_ADMIN_PASSWORD'),
    email: getEnvVar('SUPER_ADMIN_EMAIL'),
  },
};

export default config;

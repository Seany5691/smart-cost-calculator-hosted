import { Pool, PoolConfig } from 'pg';

const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  min: 2,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

// Create a singleton pool instance
let poolInstance: Pool | null = null;

export function getPool(): Pool {
  if (!poolInstance) {
    poolInstance = new Pool(poolConfig);
    
    poolInstance.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }
  
  return poolInstance;
}

// Export pool for direct use in API routes
export const pool = getPool();

export async function query(text: string, params?: any[]) {
  const poolInstance = getPool();
  const start = Date.now();
  try {
    const res = await poolInstance.query(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries (> 1 second)
    if (duration > 1000) {
      console.warn('Slow query detected:', { text, duration, rows: res.rowCount });
    }
    
    return res;
  } catch (error) {
    console.error('Database query error:', { text, error });
    throw error;
  }
}

export async function getClient() {
  const poolInstance = getPool();
  return poolInstance.connect();
}

export async function closePool() {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
  }
}

// Health check function
export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query('SELECT 1');
    return result.rowCount === 1;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

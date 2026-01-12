/**
 * PostgreSQL Database Connection
 * 
 * This module provides a direct PostgreSQL connection for the VPS-hosted version
 * of the Smart Cost Calculator app, using PostgreSQL as the primary database.
 */

import { Pool, PoolClient } from 'pg';

// Database configuration from environment variables
const dbConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE || 'smartcost_vps',
  user: process.env.POSTGRES_USER || 'smartcost_user',
  password: process.env.POSTGRES_PASSWORD || '',
  max: 20, // Maximum number of connections in pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait when connecting a new client
};

// Create connection pool
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Database helper functions
export const postgresql = {
  /**
   * Execute a query with parameters
   */
  async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('Database query error:', { text, params, error });
      throw error;
    }
  },

  /**
   * Get a single client from the pool for transactions
   */
  async getClient(): Promise<PoolClient> {
    return pool.connect();
  },

  /**
   * Execute a transaction
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW()');
      return result.rows.length > 0;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  },

  /**
   * Close all connections in the pool
   */
  async close(): Promise<void> {
    await pool.end();
  },
};

// Database schema helpers
export const dbHelpers = {
  // Hardware items
  async getHardwareItems() {
    const { rows } = await postgresql.query(`
      SELECT * FROM hardware_items 
      WHERE isActive = true 
      ORDER BY name
    `);
    
    // Ensure proper type conversion for numeric fields
    return rows.map((item: any) => ({
      ...item,
      cost: parseFloat(item.cost),
      managerCost: item.managerCost ? parseFloat(item.managerCost) : null,
      userCost: item.userCost ? parseFloat(item.userCost) : null,
      quantity: parseInt(item.quantity),
    }));
  },

  async updateHardwareItems(items: any[]) {
    await postgresql.transaction(async (client) => {
      // First, deactivate all items
      await client.query(
        'UPDATE hardware_items SET isActive = false WHERE isActive = true'
      );

      // Then insert/update the new items
      for (const item of items) {
        await client.query(`
          INSERT INTO hardware_items (
            id, name, cost, managerCost, userCost, quantity, 
            locked, isExtension, isActive, createdAt, updatedAt, displayOrder
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), $10
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            cost = EXCLUDED.cost,
            managerCost = EXCLUDED.managerCost,
            userCost = EXCLUDED.userCost,
            locked = EXCLUDED.locked,
            isExtension = EXCLUDED.isExtension,
            isActive = EXCLUDED.isActive,
            updatedAt = NOW(),
            displayOrder = EXCLUDED.displayOrder
        `, [
          item.id, item.name, item.cost, item.managerCost, item.userCost,
          item.quantity || 0, item.locked || false, item.isExtension || false,
          true, item.displayOrder || 0
        ]);
      }
    });
  },

  // Connectivity items
  async getConnectivityItems() {
    const { rows } = await postgresql.query(`
      SELECT * FROM connectivity_items 
      WHERE isActive = true 
      ORDER BY name
    `);
    
    return rows.map((item: any) => ({
      ...item,
      cost: parseFloat(item.cost),
      managerCost: item.managerCost ? parseFloat(item.managerCost) : null,
      userCost: item.userCost ? parseFloat(item.userCost) : null,
      quantity: parseInt(item.quantity),
    }));
  },

  async updateConnectivityItems(items: any[]) {
    await postgresql.transaction(async (client) => {
      // First, deactivate all items
      await client.query(
        'UPDATE connectivity_items SET isActive = false WHERE isActive = true'
      );

      // Then insert/update the new items
      for (const item of items) {
        await client.query(`
          INSERT INTO connectivity_items (
            id, name, cost, managerCost, userCost, quantity, 
            locked, isActive, createdAt, updatedAt, displayOrder
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), $9
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            cost = EXCLUDED.cost,
            managerCost = EXCLUDED.managerCost,
            userCost = EXCLUDED.userCost,
            locked = EXCLUDED.locked,
            isActive = EXCLUDED.isActive,
            updatedAt = NOW(),
            displayOrder = EXCLUDED.displayOrder
        `, [
          item.id, item.name, item.cost, item.managerCost, item.userCost,
          item.quantity || 0, item.locked || false, true, item.displayOrder || 0
        ]);
      }
    });
  },

  // Licensing items
  async getLicensingItems() {
    const { rows } = await postgresql.query(`
      SELECT * FROM licensing_items 
      WHERE isActive = true 
      ORDER BY name
    `);
    
    return rows.map((item: any) => ({
      ...item,
      cost: parseFloat(item.cost),
      managerCost: item.managerCost ? parseFloat(item.managerCost) : null,
      userCost: item.userCost ? parseFloat(item.userCost) : null,
      quantity: parseInt(item.quantity),
    }));
  },

  async updateLicensingItems(items: any[]) {
    await postgresql.transaction(async (client) => {
      // First, deactivate all items
      await client.query(
        'UPDATE licensing_items SET isActive = false WHERE isActive = true'
      );

      // Then insert/update the new items
      for (const item of items) {
        await client.query(`
          INSERT INTO licensing_items (
            id, name, cost, managerCost, userCost, quantity, 
            locked, isActive, createdAt, updatedAt, displayOrder
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), $9
          )
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            cost = EXCLUDED.cost,
            managerCost = EXCLUDED.managerCost,
            userCost = EXCLUDED.userCost,
            locked = EXCLUDED.locked,
            isActive = EXCLUDED.isActive,
            updatedAt = NOW(),
            displayOrder = EXCLUDED.displayOrder
        `, [
          item.id, item.name, item.cost, item.managerCost, item.userCost,
          item.quantity || 0, item.locked || false, true, item.displayOrder || 0
        ]);
      }
    });
  },

  // Factors
  async getFactors() {
    const { rows } = await postgresql.query(`
      SELECT factors_data FROM factors 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    return rows[0]?.factors_data || {};
  },

  async updateFactors(factors: any) {
    const { rows } = await postgresql.query(`
      INSERT INTO factors (factors_data, created_at, updated_at)
      VALUES ($1, NOW(), NOW())
      RETURNING *
    `, [factors]);
    
    return rows[0];
  },

  // Scales
  async getScales() {
    const { rows } = await postgresql.query(`
      SELECT scales_data FROM scales 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (!rows[0]?.scales_data) {
      // Return default scales
      return {
        installation: {
          "0-4": 3500,
          "5-8": 3500,
          "9-16": 7000,
          "17-32": 10500,
          "33+": 15000
        },
        finance_fee: {
          "0-20000": 1800,
          "20001-50000": 1800,
          "50001-100000": 2800,
          "100001+": 3800
        },
        gross_profit: {
          "0-4": 10000,
          "5-8": 15000,
          "9-16": 20000,
          "17-32": 25000,
          "33+": 30000
        },
        additional_costs: {
          cost_per_kilometer: 1.5,
          cost_per_point: 750
        }
      };
    }
    
    return rows[0].scales_data;
  },

  async updateScales(scales: any) {
    const { rows } = await postgresql.query(`
      INSERT INTO scales (scales_data, created_at, updated_at)
      VALUES ($1, NOW(), NOW())
      RETURNING *
    `, [scales]);
    
    return rows[0];
  },

  // Deal calculations
  async getDeals(userId?: string, isAdmin: boolean = false) {
    let query = `
      SELECT * FROM deal_calculations 
      ORDER BY created_at DESC
    `;
    let params: any[] = [];

    if (!isAdmin && userId) {
      query = `
        SELECT * FROM deal_calculations 
        WHERE user_id = $1 
        ORDER BY created_at DESC
      `;
      params = [userId];
    }

    const { rows } = await postgresql.query(query, params);
    return rows;
  },

  async getDealById(dealId: string) {
    const { rows } = await postgresql.query(`
      SELECT * FROM deal_calculations 
      WHERE id = $1
    `, [dealId]);
    
    return rows[0] || null;
  },

  async createDeal(deal: any) {
    const { rows } = await postgresql.query(`
      INSERT INTO deal_calculations (
        id, user_id, username, user_role, deal_name, customer_name,
        deal_details, sections_data, totals_data, factors_data, scales_data,
        pdf_url, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
      )
      RETURNING *
    `, [
      deal.id, deal.userId, deal.username, deal.userRole,
      deal.dealName, deal.customerName, deal.dealDetails,
      deal.sectionsData, deal.totalsData, deal.factorsData,
      deal.scalesData, deal.pdfUrl
    ]);
    
    return rows[0];
  },

  async updateDeal(dealId: string, updates: any) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    // Build dynamic update query
    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      fields.push(`${dbKey} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }

    fields.push(`updated_at = NOW()`);
    values.push(dealId);

    const { rows } = await postgresql.query(`
      UPDATE deal_calculations 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);
    
    return rows[0];
  },

  async deleteDeal(dealId: string) {
    const { rowCount } = await postgresql.query(`
      DELETE FROM deal_calculations 
      WHERE id = $1
    `, [dealId]);
    
    return rowCount > 0;
  },

  // Users
  async getUserByUsername(username: string) {
    const { rows } = await postgresql.query(`
      SELECT * FROM users 
      WHERE username = $1 AND is_active = true
    `, [username]);
    
    return rows[0] || null;
  },

  async getAllUsers() {
    const { rows } = await postgresql.query(`
      SELECT * FROM users 
      WHERE is_active = true 
      ORDER BY username
    `);
    
    return rows;
  },

  async createUser(user: any) {
    const { rows } = await postgresql.query(`
      INSERT INTO users (
        id, username, password, role, name, email, 
        is_active, requires_password_change, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
      )
      RETURNING *
    `, [
      user.id, user.username, user.password, user.role,
      user.name, user.email, user.isActive, user.requiresPasswordChange
    ]);
    
    return rows[0];
  },

  async updateUser(id: string, updates: any) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      fields.push(`${dbKey} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await postgresql.query(`
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);
    
    return rows[0];
  },

  async deleteUser(id: string) {
    const { rowCount } = await postgresql.query(`
      UPDATE users 
      SET is_active = false 
      WHERE id = $1
    `, [id]);
    
    return rowCount > 0;
  },

  // Activity logs
  async getActivityLogs(userId?: string, limit: number = 100) {
    let query = `
      SELECT * FROM activity_logs 
      ORDER BY timestamp DESC 
      LIMIT $1
    `;
    let params = [limit as number];

    if (userId) {
      query = `
        SELECT * FROM activity_logs 
        WHERE user_id = $1 
        ORDER BY timestamp DESC 
        LIMIT $2
      `;
      params = [userId, limit as number];
    }

    const { rows } = await postgresql.query(query, params);
    return rows;
  },

  async getActivityLogsPaginated(userId?: string, page: number = 1, pageSize: number = 20) {
    const offset = (page - 1) * pageSize;
    
    let countQuery = userId 
      ? 'SELECT COUNT(*) FROM activity_logs WHERE user_id = $1'
      : 'SELECT COUNT(*) FROM activity_logs';
    
    let dataQuery = userId
      ? `SELECT * FROM activity_logs WHERE user_id = $1 ORDER BY timestamp DESC LIMIT $2 OFFSET $3`
      : `SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT $1 OFFSET $2`;

    let countParams = userId ? [userId] : [];
    let dataParams = userId ? [userId, pageSize, offset] : [pageSize, offset];

    const [countResult, dataResult] = await Promise.all([
      postgresql.query(countQuery, countParams),
      postgresql.query(dataQuery, dataParams)
    ]);

    const totalCount = parseInt(countResult.rows[0].count);
    const hasMore = offset + pageSize < totalCount;

    return {
      data: dataResult.rows,
      hasMore,
      totalCount,
      page,
      pageSize
    };
  },

  async createActivityLog(log: any) {
    try {
      const query = `
        INSERT INTO activity_logs (
          id, user_id, username, user_role, activity_type, 
          deal_id, deal_name, timestamp, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
      
      await postgresql.query(query, [
        log.id,
        log.userId,
        log.username,
        log.userRole,
        log.activityType,
        log.dealId || null,
        log.dealName || null,
        log.timestamp,
        JSON.stringify(log.metadata || {}),
        new Date().toISOString()
      ]);
    } catch (error) {
      console.error('Error creating activity log:', error);
      throw error;
    }
  },

  async createImportSession(session: any) {
    try {
      const query = `
        INSERT INTO import_sessions (
          id, source_type, file_name, total_records, imported_records,
          failed_records, status, user_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      
      const result = await postgresql.query(query, [
        session.id || `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        session.source_type,
        session.file_name,
        session.total_records,
        session.imported_records,
        session.failed_records,
        session.status,
        session.user_id,
        new Date().toISOString(),
        new Date().toISOString()
      ]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error creating import session:', error);
      throw error;
    }
  },

  async updateImportSession(id: string, updates: any) {
    try {
      const setClause = Object.keys(updates)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');
      
      const query = `
        UPDATE import_sessions 
        SET ${setClause}, updated_at = $${Object.keys(updates).length + 2}
        WHERE id = $1
        RETURNING *
      `;
      
      const values = [id, ...Object.values(updates), new Date().toISOString()];
      const result = await postgresql.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error updating import session:', error);
      throw error;
    }
  }
};

// Note: PostgreSQL connection testing should be done manually via npm run test-db
// Automatic connection testing is disabled to prevent client-side execution issues

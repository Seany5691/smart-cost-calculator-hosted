import pool from './postgresql-connection';
import { ActivityLog } from './activityLogger';

export const databaseHelpers = {
  async createActivityLog(log: ActivityLog) {
    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO activity_logs (id, user_id, username, user_role, activity_type, deal_id, deal_name, timestamp, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      const values = [
        log.id,
        log.userId,
        log.username,
        log.userRole,
        log.activityType,
        log.dealId,
        log.dealName,
        log.timestamp,
        JSON.stringify(log.metadata || {})
      ];
      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  },

  async getActivityLogs(userId: string, limit = 50) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT * FROM activity_logs 
        WHERE user_id = $1 
        ORDER BY timestamp DESC 
        LIMIT $2
      `;
      const result = await client.query(query, [userId, limit]);
      return result.rows;
    } finally {
      client.release();
    }
  },

  async getDeals(userId: string, isAdmin = false) {
    const client = await pool.connect();
    try {
      let query = `
        SELECT * FROM leads 
        WHERE user_id = $1
        ORDER BY updated_at DESC
      `;
      const params = [userId];
      
      if (!isAdmin) {
        query = `
          SELECT * FROM leads 
          WHERE user_id = $1
          ORDER BY updated_at DESC
        `;
      }
      
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  },

  async createDeal(dealData: any) {
    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO leads (
          id, user_id, username, user_role, customer_name, deal_name, 
          deal_details, status, phone, provider, address, type_of_business, 
          town, notes, date_to_call_back, coordinates, background_color, 
          list_name, import_session_id, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *
      `;
      const values = [
        dealData.id,
        dealData.userId,
        dealData.username,
        dealData.userRole,
        dealData.customerName,
        dealData.dealName,
        JSON.stringify(dealData.dealDetails),
        dealData.status,
        dealData.phone,
        dealData.provider,
        dealData.address,
        dealData.type_of_business,
        dealData.town,
        dealData.notes,
        dealData.date_to_call_back,
        JSON.stringify(dealData.coordinates),
        dealData.background_color,
        dealData.list_name,
        dealData.import_session_id,
        dealData.created_at,
        dealData.updated_at
      ];
      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  },

  async updateDeal(id: string, updates: any) {
    const client = await pool.connect();
    try {
      const fields = Object.keys(updates);
      const values = Object.values(updates);
      const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
      
      const query = `
        UPDATE leads 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${fields.length + 1}
        RETURNING *
      `;
      
      const result = await client.query(query, [...values, id]);
      return result.rows[0];
    } finally {
      client.release();
    }
  },

  async deleteDeal(id: string) {
    const client = await pool.connect();
    try {
      const query = 'DELETE FROM leads WHERE id = $1 RETURNING *';
      const result = await client.query(query, [id]);
      return result.rows[0];
    } finally {
      client.release();
    }
  },

  async getRoutes(userId: string) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT * FROM routes 
        WHERE user_id = $1 
        ORDER BY created_at DESC
      `;
      const result = await client.query(query, [userId]);
      return result.rows;
    } finally {
      client.release();
    }
  },

  async createRoute(userId: string, routeData: any) {
    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO routes (id, user_id, name, route_url, stop_count, lead_ids, starting_point, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      const values = [
        routeData.id,
        userId,
        routeData.name,
        routeData.route_url,
        routeData.stop_count,
        JSON.stringify(routeData.lead_ids),
        JSON.stringify(routeData.starting_point)
      ];
      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  },

  async deleteRoute(userId: string, routeId: string) {
    const client = await pool.connect();
    try {
      const query = 'DELETE FROM routes WHERE id = $1 AND user_id = $2 RETURNING *';
      const result = await client.query(query, [routeId, userId]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }
};

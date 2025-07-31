const { query, transaction } = require('../config/database');

class Conversation {
  constructor(data) {
    this.id = data.id;
    this.ad_id = data.ad_id;
    this.buyer_id = data.buyer_id;
    this.seller_id = data.seller_id;
    this.status = data.status || 'active';
    this.last_message_at = data.last_message_at;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Static methods for database operations

  static async findById(id) {
    try {
      const result = await query(
        'SELECT * FROM conversations WHERE id = $1',
        [id]
      );
      return result.rows.length > 0 ? new Conversation(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding conversation by ID:', error);
      throw error;
    }
  }

  static async findByParticipants(adId, buyerId, sellerId) {
    try {
      const result = await query(
        'SELECT * FROM conversations WHERE ad_id = $1 AND buyer_id = $2 AND seller_id = $3',
        [adId, buyerId, sellerId]
      );
      return result.rows.length > 0 ? new Conversation(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding conversation by participants:', error);
      throw error;
    }
  }

  static async findByUserId(userId, limit = 20, offset = 0) {
    try {
      const result = await query(`
        SELECT c.*, cd.*
        FROM conversations c
        LEFT JOIN conversation_details cd ON c.id = cd.conversation_id
        WHERE (c.buyer_id = $1 OR c.seller_id = $1)
        ORDER BY c.last_message_at DESC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);
      
      return result.rows.map(row => ({
        conversation: new Conversation(row),
        details: {
          ad_title: row.ad_title,
          make: row.make,
          model: row.model,
          year: row.year,
          price: row.price,
          buyer_name: row.buyer_name,
          buyer_phone: row.buyer_phone,
          seller_name: row.seller_name,
          seller_phone: row.seller_phone,
          unread_count: row.unread_count
        }
      }));
    } catch (error) {
      console.error('Error finding conversations by user ID:', error);
      throw error;
    }
  }

  static async findByAdId(adId, limit = 20, offset = 0) {
    try {
      const result = await query(`
        SELECT c.*, cd.*
        FROM conversations c
        LEFT JOIN conversation_details cd ON c.id = cd.conversation_id
        WHERE c.ad_id = $1
        ORDER BY c.last_message_at DESC
        LIMIT $2 OFFSET $3
      `, [adId, limit, offset]);
      
      return result.rows.map(row => ({
        conversation: new Conversation(row),
        details: {
          ad_title: row.ad_title,
          make: row.make,
          model: row.model,
          year: row.year,
          price: row.price,
          buyer_name: row.buyer_name,
          buyer_phone: row.buyer_phone,
          seller_name: row.seller_name,
          seller_phone: row.seller_phone,
          unread_count: row.unread_count
        }
      }));
    } catch (error) {
      console.error('Error finding conversations by ad ID:', error);
      throw error;
    }
  }

  static async create(conversationData) {
    try {
      const { ad_id, buyer_id, seller_id, status = 'active' } = conversationData;
      
      // Check if conversation already exists
      const existing = await this.findByParticipants(ad_id, buyer_id, seller_id);
      if (existing) {
        return existing;
      }

      const result = await query(`
        INSERT INTO conversations (ad_id, buyer_id, seller_id, status)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [ad_id, buyer_id, seller_id, status]);

      return new Conversation(result.rows[0]);
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  static async updateStatus(id, status) {
    try {
      const result = await query(
        'UPDATE conversations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [status, id]
      );
      return result.rows.length > 0 ? new Conversation(result.rows[0]) : null;
    } catch (error) {
      console.error('Error updating conversation status:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const result = await query(
        'DELETE FROM conversations WHERE id = $1 RETURNING *',
        [id]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }

  static async getUnreadCount(conversationId, userId) {
    try {
      const result = await query(`
        SELECT COUNT(*) as unread_count
        FROM messages m
        WHERE m.conversation_id = $1 
        AND m.sender_id != $2
        AND NOT EXISTS (
          SELECT 1 FROM message_read_status mrs 
          WHERE mrs.message_id = m.id AND mrs.user_id = $2
        )
      `, [conversationId, userId]);
      
      return parseInt(result.rows[0].unread_count);
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  static async markAsRead(conversationId, userId) {
    try {
      return await transaction(async (client) => {
        // Get all unread messages in the conversation
        const unreadMessages = await client.query(`
          SELECT m.id
          FROM messages m
          WHERE m.conversation_id = $1 
          AND m.sender_id != $2
          AND NOT EXISTS (
            SELECT 1 FROM message_read_status mrs 
            WHERE mrs.message_id = m.id AND mrs.user_id = $2
          )
        `, [conversationId, userId]);

        // Mark them as read
        for (const message of unreadMessages.rows) {
          await client.query(`
            INSERT INTO message_read_status (message_id, user_id)
            VALUES ($1, $2)
            ON CONFLICT (message_id, user_id) DO NOTHING
          `, [message.id, userId]);
        }

        return unreadMessages.rows.length;
      });
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      throw error;
    }
  }

  // Instance methods
  async update(data) {
    try {
      const fields = [];
      const values = [];
      let valueIndex = 1;

      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && key !== 'id') {
          fields.push(`${key} = $${valueIndex}`);
          values.push(data[key]);
          valueIndex++;
        }
      });

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(this.id);

      const result = await query(
        `UPDATE conversations SET ${fields.join(', ')} WHERE id = $${valueIndex} RETURNING *`,
        values
      );

      if (result.rows.length > 0) {
        Object.assign(this, result.rows[0]);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating conversation:', error);
      throw error;
    }
  }

  async delete() {
    try {
      return await Conversation.delete(this.id);
    } catch (error) {
      console.error('Error deleting conversation instance:', error);
      throw error;
    }
  }

  toJSON() {
    return {
      id: this.id,
      ad_id: this.ad_id,
      buyer_id: this.buyer_id,
      seller_id: this.seller_id,
      status: this.status,
      last_message_at: this.last_message_at,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = Conversation;

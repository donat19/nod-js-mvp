const { query, transaction } = require('../config/database');

class Message {
  constructor(data) {
    this.id = data.id;
    this.conversation_id = data.conversation_id;
    this.sender_id = data.sender_id;
    this.message_text = data.message_text;
    this.message_type = data.message_type || 'text';
    this.is_read = data.is_read || false;
    this.is_edited = data.is_edited || false;
    this.edited_at = data.edited_at;
    this.metadata = data.metadata;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Static methods for database operations

  static async findById(id) {
    try {
      const result = await query(
        'SELECT * FROM messages WHERE id = $1',
        [id]
      );
      return result.rows.length > 0 ? new Message(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding message by ID:', error);
      throw error;
    }
  }

  static async findByConversationId(conversationId, limit = 50, offset = 0, orderBy = 'DESC') {
    try {
      const result = await query(`
        SELECT m.*, 
               u.name as sender_name,
               u.phone as sender_phone,
               EXISTS(
                 SELECT 1 FROM message_read_status mrs 
                 WHERE mrs.message_id = m.id
               ) as has_read_status
        FROM messages m
        LEFT JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = $1
        ORDER BY m.created_at ${orderBy}
        LIMIT $2 OFFSET $3
      `, [conversationId, limit, offset]);
      
      return result.rows.map(row => ({
        message: new Message(row),
        sender_name: row.sender_name,
        sender_phone: row.sender_phone,
        has_read_status: row.has_read_status
      }));
    } catch (error) {
      console.error('Error finding messages by conversation ID:', error);
      throw error;
    }
  }

  static async findBySenderId(senderId, limit = 20, offset = 0) {
    try {
      const result = await query(`
        SELECT m.*, c.ad_id
        FROM messages m
        LEFT JOIN conversations c ON m.conversation_id = c.id
        WHERE m.sender_id = $1
        ORDER BY m.created_at DESC
        LIMIT $2 OFFSET $3
      `, [senderId, limit, offset]);
      
      return result.rows.map(row => new Message(row));
    } catch (error) {
      console.error('Error finding messages by sender ID:', error);
      throw error;
    }
  }

  static async create(messageData) {
    try {
      const { 
        conversation_id, 
        sender_id, 
        message_text, 
        message_type = 'text',
        metadata = null 
      } = messageData;

      const result = await query(`
        INSERT INTO messages (conversation_id, sender_id, message_text, message_type, metadata)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [conversation_id, sender_id, message_text, message_type, metadata]);

      return new Message(result.rows[0]);
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  }

  static async updateMessage(id, messageText, metadata = null) {
    try {
      const result = await query(`
        UPDATE messages 
        SET message_text = $1, 
            metadata = $2,
            is_edited = TRUE,
            edited_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 
        RETURNING *
      `, [messageText, metadata, id]);
      
      return result.rows.length > 0 ? new Message(result.rows[0]) : null;
    } catch (error) {
      console.error('Error updating message:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const result = await query(
        'DELETE FROM messages WHERE id = $1 RETURNING *',
        [id]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  static async markAsRead(messageId, userId) {
    try {
      const result = await query(`
        INSERT INTO message_read_status (message_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT (message_id, user_id) DO NOTHING
        RETURNING *
      `, [messageId, userId]);
      
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  }

  static async getReadStatus(messageId) {
    try {
      const result = await query(`
        SELECT mrs.user_id, mrs.read_at, u.name as user_name
        FROM message_read_status mrs
        LEFT JOIN users u ON mrs.user_id = u.id
        WHERE mrs.message_id = $1
        ORDER BY mrs.read_at DESC
      `, [messageId]);
      
      return result.rows;
    } catch (error) {
      console.error('Error getting message read status:', error);
      throw error;
    }
  }

  static async getUnreadMessages(userId, conversationId = null) {
    try {
      let query_text = `
        SELECT m.*, c.ad_id, u.name as sender_name
        FROM messages m
        LEFT JOIN conversations c ON m.conversation_id = c.id
        LEFT JOIN users u ON m.sender_id = u.id
        WHERE m.sender_id != $1
        AND NOT EXISTS (
          SELECT 1 FROM message_read_status mrs 
          WHERE mrs.message_id = m.id AND mrs.user_id = $1
        )
      `;
      
      const params = [userId];
      
      if (conversationId) {
        query_text += ' AND m.conversation_id = $2';
        params.push(conversationId);
      }
      
      query_text += ' ORDER BY m.created_at DESC';
      
      const result = await query(query_text, params);
      
      return result.rows.map(row => ({
        message: new Message(row),
        ad_id: row.ad_id,
        sender_name: row.sender_name
      }));
    } catch (error) {
      console.error('Error getting unread messages:', error);
      throw error;
    }
  }

  static async searchMessages(conversationId, searchTerm, limit = 20) {
    try {
      const result = await query(`
        SELECT m.*, u.name as sender_name
        FROM messages m
        LEFT JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = $1
        AND (
          m.message_text ILIKE $2
          OR m.metadata::text ILIKE $2
        )
        ORDER BY m.created_at DESC
        LIMIT $3
      `, [conversationId, `%${searchTerm}%`, limit]);
      
      return result.rows.map(row => ({
        message: new Message(row),
        sender_name: row.sender_name
      }));
    } catch (error) {
      console.error('Error searching messages:', error);
      throw error;
    }
  }

  static async getMessageStats(conversationId) {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total_messages,
          COUNT(CASE WHEN message_type = 'text' THEN 1 END) as text_messages,
          COUNT(CASE WHEN message_type = 'image' THEN 1 END) as image_messages,
          COUNT(CASE WHEN message_type = 'offer' THEN 1 END) as offer_messages,
          COUNT(CASE WHEN message_type = 'system' THEN 1 END) as system_messages,
          COUNT(DISTINCT sender_id) as unique_senders,
          MIN(created_at) as first_message_at,
          MAX(created_at) as last_message_at
        FROM messages
        WHERE conversation_id = $1
      `, [conversationId]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error getting message stats:', error);
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

      // Always update the updated_at timestamp
      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(this.id);

      const result = await query(
        `UPDATE messages SET ${fields.join(', ')} WHERE id = $${valueIndex} RETURNING *`,
        values
      );

      if (result.rows.length > 0) {
        Object.assign(this, result.rows[0]);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating message:', error);
      throw error;
    }
  }

  async delete() {
    try {
      return await Message.delete(this.id);
    } catch (error) {
      console.error('Error deleting message instance:', error);
      throw error;
    }
  }

  async markAsRead(userId) {
    try {
      return await Message.markAsRead(this.id, userId);
    } catch (error) {
      console.error('Error marking message instance as read:', error);
      throw error;
    }
  }

  async getReadStatus() {
    try {
      return await Message.getReadStatus(this.id);
    } catch (error) {
      console.error('Error getting message instance read status:', error);
      throw error;
    }
  }

  toJSON() {
    return {
      id: this.id,
      conversation_id: this.conversation_id,
      sender_id: this.sender_id,
      message_text: this.message_text,
      message_type: this.message_type,
      is_read: this.is_read,
      is_edited: this.is_edited,
      edited_at: this.edited_at,
      metadata: this.metadata,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = Message;

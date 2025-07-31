const { query, transaction } = require('../config/database');

class MessageAttachment {
  constructor(data) {
    this.id = data.id;
    this.message_id = data.message_id;
    this.file_name = data.file_name;
    this.file_path = data.file_path;
    this.file_size = data.file_size;
    this.file_type = data.file_type;
    this.mime_type = data.mime_type;
    this.thumbnail_path = data.thumbnail_path;
    this.is_processed = data.is_processed || false;
    this.upload_status = data.upload_status || 'pending';
    this.created_at = data.created_at;
  }

  // Static methods for database operations

  static async findById(id) {
    try {
      const result = await query(
        'SELECT * FROM message_attachments WHERE id = $1',
        [id]
      );
      return result.rows.length > 0 ? new MessageAttachment(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding attachment by ID:', error);
      throw error;
    }
  }

  static async findByMessageId(messageId) {
    try {
      const result = await query(
        'SELECT * FROM message_attachments WHERE message_id = $1 ORDER BY created_at ASC',
        [messageId]
      );
      return result.rows.map(row => new MessageAttachment(row));
    } catch (error) {
      console.error('Error finding attachments by message ID:', error);
      throw error;
    }
  }

  static async create(attachmentData) {
    try {
      const {
        message_id,
        file_name,
        file_path,
        file_size,
        file_type,
        mime_type,
        thumbnail_path = null,
        upload_status = 'pending'
      } = attachmentData;

      const result = await query(`
        INSERT INTO message_attachments 
        (message_id, file_name, file_path, file_size, file_type, mime_type, thumbnail_path, upload_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [message_id, file_name, file_path, file_size, file_type, mime_type, thumbnail_path, upload_status]);

      return new MessageAttachment(result.rows[0]);
    } catch (error) {
      console.error('Error creating attachment:', error);
      throw error;
    }
  }

  static async updateStatus(id, status, isProcessed = false) {
    try {
      const result = await query(`
        UPDATE message_attachments 
        SET upload_status = $1, is_processed = $2
        WHERE id = $3 
        RETURNING *
      `, [status, isProcessed, id]);
      
      return result.rows.length > 0 ? new MessageAttachment(result.rows[0]) : null;
    } catch (error) {
      console.error('Error updating attachment status:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const result = await query(
        'DELETE FROM message_attachments WHERE id = $1 RETURNING *',
        [id]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error deleting attachment:', error);
      throw error;
    }
  }

  toJSON() {
    return {
      id: this.id,
      message_id: this.message_id,
      file_name: this.file_name,
      file_path: this.file_path,
      file_size: this.file_size,
      file_type: this.file_type,
      mime_type: this.mime_type,
      thumbnail_path: this.thumbnail_path,
      is_processed: this.is_processed,
      upload_status: this.upload_status,
      created_at: this.created_at
    };
  }
}

class MessageReaction {
  constructor(data) {
    this.id = data.id;
    this.message_id = data.message_id;
    this.user_id = data.user_id;
    this.reaction_type = data.reaction_type;
    this.emoji = data.emoji;
    this.created_at = data.created_at;
  }

  static async findByMessageId(messageId) {
    try {
      const result = await query(`
        SELECT mr.*, u.name as user_name
        FROM message_reactions mr
        LEFT JOIN users u ON mr.user_id = u.id
        WHERE mr.message_id = $1
        ORDER BY mr.created_at ASC
      `, [messageId]);
      
      return result.rows.map(row => ({
        reaction: new MessageReaction(row),
        user_name: row.user_name
      }));
    } catch (error) {
      console.error('Error finding reactions by message ID:', error);
      throw error;
    }
  }

  static async addReaction(messageId, userId, reactionType, emoji) {
    try {
      const result = await query(`
        INSERT INTO message_reactions (message_id, user_id, reaction_type, emoji)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (message_id, user_id, reaction_type) 
        DO UPDATE SET emoji = EXCLUDED.emoji, created_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [messageId, userId, reactionType, emoji]);

      return new MessageReaction(result.rows[0]);
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }

  static async removeReaction(messageId, userId, reactionType) {
    try {
      const result = await query(
        'DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND reaction_type = $3 RETURNING *',
        [messageId, userId, reactionType]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error removing reaction:', error);
      throw error;
    }
  }

  static async getReactionSummary(messageId) {
    try {
      const result = await query(`
        SELECT 
          reaction_type,
          emoji,
          COUNT(*) as count,
          array_agg(u.name) as user_names
        FROM message_reactions mr
        LEFT JOIN users u ON mr.user_id = u.id
        WHERE mr.message_id = $1
        GROUP BY reaction_type, emoji
        ORDER BY count DESC
      `, [messageId]);
      
      return result.rows;
    } catch (error) {
      console.error('Error getting reaction summary:', error);
      throw error;
    }
  }
}

class TypingIndicator {
  constructor(data) {
    this.id = data.id;
    this.conversation_id = data.conversation_id;
    this.user_id = data.user_id;
    this.is_typing = data.is_typing;
    this.last_activity = data.last_activity;
  }

  static async setTyping(conversationId, userId, isTyping = true) {
    try {
      const result = await query(`
        INSERT INTO typing_indicators (conversation_id, user_id, is_typing)
        VALUES ($1, $2, $3)
        ON CONFLICT (conversation_id, user_id)
        DO UPDATE SET is_typing = EXCLUDED.is_typing, last_activity = CURRENT_TIMESTAMP
        RETURNING *
      `, [conversationId, userId, isTyping]);

      return new TypingIndicator(result.rows[0]);
    } catch (error) {
      console.error('Error setting typing indicator:', error);
      throw error;
    }
  }

  static async getTypingUsers(conversationId, excludeUserId = null) {
    try {
      let queryText = `
        SELECT ti.*, u.name as user_name
        FROM typing_indicators ti
        LEFT JOIN users u ON ti.user_id = u.id
        WHERE ti.conversation_id = $1 
        AND ti.is_typing = TRUE 
        AND ti.last_activity > NOW() - INTERVAL '10 seconds'
      `;
      const params = [conversationId];

      if (excludeUserId) {
        queryText += ' AND ti.user_id != $2';
        params.push(excludeUserId);
      }

      queryText += ' ORDER BY ti.last_activity DESC';

      const result = await query(queryText, params);
      
      return result.rows.map(row => ({
        indicator: new TypingIndicator(row),
        user_name: row.user_name
      }));
    } catch (error) {
      console.error('Error getting typing users:', error);
      throw error;
    }
  }

  static async cleanup() {
    try {
      const result = await query(
        'DELETE FROM typing_indicators WHERE last_activity < NOW() - INTERVAL \'30 seconds\' RETURNING *'
      );
      return result.rows.length;
    } catch (error) {
      console.error('Error cleaning up typing indicators:', error);
      throw error;
    }
  }
}

class ConversationSettings {
  constructor(data) {
    this.id = data.id;
    this.conversation_id = data.conversation_id;
    this.user_id = data.user_id;
    this.notifications_enabled = data.notifications_enabled;
    this.sound_enabled = data.sound_enabled;
    this.is_muted = data.is_muted;
    this.muted_until = data.muted_until;
    this.is_pinned = data.is_pinned;
    this.custom_name = data.custom_name;
    this.theme = data.theme;
    this.settings_json = data.settings_json;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async findByUserAndConversation(userId, conversationId) {
    try {
      const result = await query(
        'SELECT * FROM conversation_settings WHERE user_id = $1 AND conversation_id = $2',
        [userId, conversationId]
      );
      return result.rows.length > 0 ? new ConversationSettings(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding conversation settings:', error);
      throw error;
    }
  }

  static async createOrUpdate(settingsData) {
    try {
      const {
        conversation_id,
        user_id,
        notifications_enabled = true,
        sound_enabled = true,
        is_muted = false,
        muted_until = null,
        is_pinned = false,
        custom_name = null,
        theme = 'default',
        settings_json = null
      } = settingsData;

      const result = await query(`
        INSERT INTO conversation_settings 
        (conversation_id, user_id, notifications_enabled, sound_enabled, is_muted, 
         muted_until, is_pinned, custom_name, theme, settings_json)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (conversation_id, user_id)
        DO UPDATE SET 
          notifications_enabled = EXCLUDED.notifications_enabled,
          sound_enabled = EXCLUDED.sound_enabled,
          is_muted = EXCLUDED.is_muted,
          muted_until = EXCLUDED.muted_until,
          is_pinned = EXCLUDED.is_pinned,
          custom_name = EXCLUDED.custom_name,
          theme = EXCLUDED.theme,
          settings_json = EXCLUDED.settings_json,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [conversation_id, user_id, notifications_enabled, sound_enabled, is_muted, 
          muted_until, is_pinned, custom_name, theme, settings_json]);

      return new ConversationSettings(result.rows[0]);
    } catch (error) {
      console.error('Error creating/updating conversation settings:', error);
      throw error;
    }
  }

  static async getPinnedConversations(userId) {
    try {
      const result = await query(`
        SELECT cs.*, c.*, cd.*
        FROM conversation_settings cs
        LEFT JOIN conversations c ON cs.conversation_id = c.id
        LEFT JOIN conversation_details cd ON c.id = cd.conversation_id
        WHERE cs.user_id = $1 AND cs.is_pinned = TRUE
        ORDER BY cs.updated_at DESC
      `, [userId]);
      
      return result.rows.map(row => ({
        settings: new ConversationSettings(row),
        conversation: row,
        details: row
      }));
    } catch (error) {
      console.error('Error getting pinned conversations:', error);
      throw error;
    }
  }
}

class MessageTemplate {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.name = data.name;
    this.template_text = data.template_text;
    this.category = data.category;
    this.is_global = data.is_global;
    this.usage_count = data.usage_count;
    this.is_active = data.is_active;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async findByUser(userId, category = null) {
    try {
      let queryText = `
        SELECT * FROM conversation_templates 
        WHERE (user_id = $1 OR is_global = TRUE) AND is_active = TRUE
      `;
      const params = [userId];

      if (category) {
        queryText += ' AND category = $2';
        params.push(category);
      }

      queryText += ' ORDER BY usage_count DESC, created_at DESC';

      const result = await query(queryText, params);
      return result.rows.map(row => new MessageTemplate(row));
    } catch (error) {
      console.error('Error finding templates by user:', error);
      throw error;
    }
  }

  static async create(templateData) {
    try {
      const {
        user_id,
        name,
        template_text,
        category = 'custom',
        is_global = false
      } = templateData;

      const result = await query(`
        INSERT INTO conversation_templates (user_id, name, template_text, category, is_global)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [user_id, name, template_text, category, is_global]);

      return new MessageTemplate(result.rows[0]);
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }

  static async incrementUsage(id) {
    try {
      const result = await query(`
        UPDATE conversation_templates 
        SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 
        RETURNING *
      `, [id]);
      
      return result.rows.length > 0 ? new MessageTemplate(result.rows[0]) : null;
    } catch (error) {
      console.error('Error incrementing template usage:', error);
      throw error;
    }
  }
}

module.exports = {
  MessageAttachment,
  MessageReaction,
  TypingIndicator,
  ConversationSettings,
  MessageTemplate
};

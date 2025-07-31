const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { body, validationResult, param, query } = require('express-validator');

const { 
  MessageAttachment, 
  MessageReaction, 
  TypingIndicator, 
  ConversationSettings, 
  MessageTemplate 
} = require('../models/ChatEnhancements');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// Middleware for authentication
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }
  next();
};

// Configure multer for chat file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB per file
    files: 10 // Maximum 10 files per upload
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

// POST /api/chats/enhanced/upload - Upload files to chat
router.post('/enhanced/upload',
  requireAuth,
  upload.array('files', 10),
  async (req, res) => {
    try {
      const { conversation_id } = req.body;
      const userId = req.session.user.id;

      if (!conversation_id) {
        return res.status(400).json({
          success: false,
          message: 'Conversation ID is required'
        });
      }

      // Verify user has access to conversation
      const conversation = await Conversation.findById(conversation_id);
      if (!conversation || 
          (conversation.buyer_id !== userId && conversation.seller_id !== userId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this conversation'
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }

      const uploadedFiles = [];
      const errors = [];

      // Ensure upload directory exists
      const uploadDir = path.join(__dirname, '../public/uploads/chat');
      await fs.mkdir(uploadDir, { recursive: true });

      for (const file of req.files) {
        try {
          // Generate unique filename
          const timestamp = Date.now();
          const randomString = crypto.randomBytes(8).toString('hex');
          const fileExt = path.extname(file.originalname);
          const fileName = `chat_${timestamp}_${randomString}${fileExt}`;
          const filePath = path.join(uploadDir, fileName);

          let thumbnailPath = null;

          // Process images
          if (file.mimetype.startsWith('image/')) {
            // Resize and optimize image
            const processedImage = await sharp(file.buffer)
              .resize(1920, 1080, { 
                fit: 'inside', 
                withoutEnlargement: true 
              })
              .jpeg({ quality: 85 })
              .toBuffer();

            await fs.writeFile(filePath, processedImage);

            // Create thumbnail
            const thumbFileName = `thumb_${fileName}`;
            const thumbPath = path.join(uploadDir, thumbFileName);
            
            await sharp(file.buffer)
              .resize(200, 200, { fit: 'cover' })
              .jpeg({ quality: 70 })
              .toFile(thumbPath);

            thumbnailPath = `/uploads/chat/${thumbFileName}`;
          } else {
            // For non-images, save as-is
            await fs.writeFile(filePath, file.buffer);
          }

          // Create temporary message for the file
          const fileMessage = await Message.create({
            conversation_id,
            sender_id: userId,
            message_text: `Shared a file: ${file.originalname}`,
            message_type: file.mimetype.startsWith('image/') ? 'image' : 'file',
            metadata: {
              file_name: file.originalname,
              file_size: file.size,
              file_type: file.mimetype.startsWith('image/') ? 'image' : 'document'
            }
          });

          // Create attachment record
          const attachment = await MessageAttachment.create({
            message_id: fileMessage.id,
            file_name: file.originalname,
            file_path: `/uploads/chat/${fileName}`,
            file_size: file.size,
            file_type: file.mimetype.startsWith('image/') ? 'image' : 'document',
            mime_type: file.mimetype,
            thumbnail_path,
            upload_status: 'completed'
          });

          uploadedFiles.push({
            message: fileMessage,
            attachment: attachment
          });

        } catch (error) {
          console.error('Error processing file:', error);
          errors.push({
            filename: file.originalname,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        data: {
          uploaded_files: uploadedFiles,
          errors: errors
        },
        message: `Successfully uploaded ${uploadedFiles.length} files`
      });

    } catch (error) {
      console.error('Error in file upload:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload files',
        error: error.message
      });
    }
  }
);

// POST /api/chats/enhanced/reactions - Add reaction to message
router.post('/enhanced/reactions',
  requireAuth,
  [
    body('message_id').isUUID().withMessage('Valid message ID is required'),
    body('reaction_type').isIn(['like', 'love', 'laugh', 'wow', 'sad', 'angry']).withMessage('Invalid reaction type'),
    body('emoji').isLength({ min: 1, max: 10 }).withMessage('Emoji is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { message_id, reaction_type, emoji } = req.body;
      const userId = req.session.user.id;

      // Verify message exists and user has access
      const message = await Message.findById(message_id);
      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found'
        });
      }

      const conversation = await Conversation.findById(message.conversation_id);
      if (!conversation || 
          (conversation.buyer_id !== userId && conversation.seller_id !== userId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const reaction = await MessageReaction.addReaction(message_id, userId, reaction_type, emoji);

      res.json({
        success: true,
        data: reaction,
        message: 'Reaction added successfully'
      });

    } catch (error) {
      console.error('Error adding reaction:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add reaction',
        error: error.message
      });
    }
  }
);

// DELETE /api/chats/enhanced/reactions - Remove reaction from message
router.delete('/enhanced/reactions',
  requireAuth,
  [
    body('message_id').isUUID().withMessage('Valid message ID is required'),
    body('reaction_type').isIn(['like', 'love', 'laugh', 'wow', 'sad', 'angry']).withMessage('Invalid reaction type')
  ],
  async (req, res) => {
    try {
      const { message_id, reaction_type } = req.body;
      const userId = req.session.user.id;

      const removed = await MessageReaction.removeReaction(message_id, userId, reaction_type);

      if (removed) {
        res.json({
          success: true,
          message: 'Reaction removed successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Reaction not found'
        });
      }

    } catch (error) {
      console.error('Error removing reaction:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove reaction',
        error: error.message
      });
    }
  }
);

// GET /api/chats/enhanced/reactions/:messageId - Get reactions for message
router.get('/enhanced/reactions/:messageId',
  requireAuth,
  [param('messageId').isUUID().withMessage('Valid message ID is required')],
  async (req, res) => {
    try {
      const { messageId } = req.params;

      const reactions = await MessageReaction.findByMessageId(messageId);
      const summary = await MessageReaction.getReactionSummary(messageId);

      res.json({
        success: true,
        data: {
          reactions,
          summary
        }
      });

    } catch (error) {
      console.error('Error getting reactions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get reactions',
        error: error.message
      });
    }
  }
);

// POST /api/chats/enhanced/typing - Set typing indicator
router.post('/enhanced/typing',
  requireAuth,
  [
    body('conversation_id').isUUID().withMessage('Valid conversation ID is required'),
    body('is_typing').isBoolean().withMessage('is_typing must be boolean')
  ],
  async (req, res) => {
    try {
      const { conversation_id, is_typing } = req.body;
      const userId = req.session.user.id;

      // Verify access to conversation
      const conversation = await Conversation.findById(conversation_id);
      if (!conversation || 
          (conversation.buyer_id !== userId && conversation.seller_id !== userId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const indicator = await TypingIndicator.setTyping(conversation_id, userId, is_typing);

      res.json({
        success: true,
        data: indicator,
        message: 'Typing indicator updated'
      });

    } catch (error) {
      console.error('Error setting typing indicator:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to set typing indicator',
        error: error.message
      });
    }
  }
);

// GET /api/chats/enhanced/typing/:conversationId - Get typing users
router.get('/enhanced/typing/:conversationId',
  requireAuth,
  [param('conversationId').isUUID().withMessage('Valid conversation ID is required')],
  async (req, res) => {
    try {
      const { conversationId } = req.params;
      const userId = req.session.user.id;

      const typingUsers = await TypingIndicator.getTypingUsers(conversationId, userId);

      res.json({
        success: true,
        data: typingUsers
      });

    } catch (error) {
      console.error('Error getting typing users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get typing users',
        error: error.message
      });
    }
  }
);

// POST /api/chats/enhanced/settings - Update conversation settings
router.post('/enhanced/settings',
  requireAuth,
  [
    body('conversation_id').isUUID().withMessage('Valid conversation ID is required'),
    body('notifications_enabled').optional().isBoolean(),
    body('sound_enabled').optional().isBoolean(),
    body('is_muted').optional().isBoolean(),
    body('is_pinned').optional().isBoolean(),
    body('custom_name').optional().isLength({ max: 100 }),
    body('theme').optional().isIn(['default', 'dark', 'blue', 'green'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.session.user.id;
      const settingsData = { ...req.body, user_id: userId };

      const settings = await ConversationSettings.createOrUpdate(settingsData);

      res.json({
        success: true,
        data: settings,
        message: 'Settings updated successfully'
      });

    } catch (error) {
      console.error('Error updating settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update settings',
        error: error.message
      });
    }
  }
);

// GET /api/chats/enhanced/templates - Get message templates
router.get('/enhanced/templates', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { category } = req.query;

    const templates = await MessageTemplate.findByUser(userId, category);

    res.json({
      success: true,
      data: templates
    });

  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get templates',
      error: error.message
    });
  }
});

// POST /api/chats/enhanced/templates - Create message template
router.post('/enhanced/templates',
  requireAuth,
  [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Template name is required'),
    body('template_text').trim().isLength({ min: 1, max: 1000 }).withMessage('Template text is required'),
    body('category').optional().isIn(['greeting', 'pricing', 'availability', 'custom'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const userId = req.session.user.id;
      const templateData = { ...req.body, user_id: userId };

      const template = await MessageTemplate.create(templateData);

      res.status(201).json({
        success: true,
        data: template,
        message: 'Template created successfully'
      });

    } catch (error) {
      console.error('Error creating template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create template',
        error: error.message
      });
    }
  }
);

// POST /api/chats/enhanced/templates/:templateId/use - Use template (increment usage)
router.post('/enhanced/templates/:templateId/use',
  requireAuth,
  [param('templateId').isUUID().withMessage('Valid template ID is required')],
  async (req, res) => {
    try {
      const { templateId } = req.params;

      const template = await MessageTemplate.incrementUsage(templateId);

      if (template) {
        res.json({
          success: true,
          data: template,
          message: 'Template usage recorded'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }

    } catch (error) {
      console.error('Error using template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record template usage',
        error: error.message
      });
    }
  }
);

// GET /api/chats/enhanced/search - Advanced message search
router.get('/enhanced/search',
  requireAuth,
  [
    query('q').trim().isLength({ min: 1 }).withMessage('Search query is required'),
    query('conversation_id').optional().isUUID(),
    query('file_type').optional().isIn(['image', 'document', 'video', 'audio']),
    query('date_from').optional().isISO8601(),
    query('date_to').optional().isISO8601()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { 
        q: searchTerm, 
        conversation_id, 
        file_type, 
        date_from, 
        date_to,
        limit = 20,
        offset = 0
      } = req.query;
      const userId = req.session.user.id;

      // Build search query
      let searchQuery = `
        SELECT DISTINCT m.*, c.ad_id, u.name as sender_name,
               ts_rank(msi.search_vector, plainto_tsquery('english', $1)) as rank
        FROM messages m
        LEFT JOIN message_search_index msi ON m.id = msi.message_id
        LEFT JOIN conversations c ON m.conversation_id = c.id
        LEFT JOIN users u ON m.sender_id = u.id
        WHERE (c.buyer_id = $2 OR c.seller_id = $2)
        AND msi.search_vector @@ plainto_tsquery('english', $1)
      `;

      const params = [searchTerm, userId];
      let paramIndex = 3;

      if (conversation_id) {
        searchQuery += ` AND m.conversation_id = $${paramIndex}`;
        params.push(conversation_id);
        paramIndex++;
      }

      if (file_type) {
        searchQuery += ` AND EXISTS (
          SELECT 1 FROM message_attachments ma 
          WHERE ma.message_id = m.id AND ma.file_type = $${paramIndex}
        )`;
        params.push(file_type);
        paramIndex++;
      }

      if (date_from) {
        searchQuery += ` AND m.created_at >= $${paramIndex}`;
        params.push(date_from);
        paramIndex++;
      }

      if (date_to) {
        searchQuery += ` AND m.created_at <= $${paramIndex}`;
        params.push(date_to);
        paramIndex++;
      }

      searchQuery += ` ORDER BY rank DESC, m.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(limit), parseInt(offset));

      const { query } = require('../config/database');
      const result = await query(searchQuery, params);

      res.json({
        success: true,
        data: {
          search_term: searchTerm,
          results: result.rows,
          count: result.rows.length,
          has_more: result.rows.length === parseInt(limit)
        }
      });

    } catch (error) {
      console.error('Error in advanced search:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search messages',
        error: error.message
      });
    }
  }
);

module.exports = router;

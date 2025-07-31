const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const PersonalAd = require('../models/PersonalAd');
const User = require('../models/User');
const { body, validationResult, param } = require('express-validator');

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }
  next();
};

// GET /api/chats - Get all conversations for the logged-in user
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const conversations = await Conversation.findByUserId(userId, limit, offset);
    
    res.json({
      success: true,
      data: conversations,
      pagination: {
        page,
        limit,
        hasMore: conversations.length === limit
      }
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations',
      error: error.message
    });
  }
});

// POST /api/chats - Create a new conversation
router.post('/',
  requireAuth,
  [
    body('ad_id').isUUID().withMessage('Valid ad ID is required'),
    body('message').trim().isLength({ min: 1, max: 1000 }).withMessage('Message must be between 1 and 1000 characters')
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

      const { ad_id, message } = req.body;
      const buyerId = req.session.user.id;

      // Get the ad to find the seller
      const ad = await PersonalAd.findById(ad_id);
      if (!ad) {
        return res.status(404).json({
          success: false,
          message: 'Ad not found'
        });
      }

      // Prevent users from messaging themselves
      if (ad.user_id === buyerId) {
        return res.status(400).json({
          success: false,
          message: 'You cannot message yourself about your own ad'
        });
      }

      const sellerId = ad.user_id;

      // Create or get existing conversation
      let conversation = await Conversation.findByParticipants(ad_id, buyerId, sellerId);
      if (!conversation) {
        conversation = await Conversation.create({
          ad_id,
          buyer_id: buyerId,
          seller_id: sellerId
        });
      }

      // Create the initial message
      const newMessage = await Message.create({
        conversation_id: conversation.id,
        sender_id: buyerId,
        message_text: message,
        message_type: 'text'
      });

      res.status(201).json({
        success: true,
        data: {
          conversation: conversation.toJSON(),
          message: newMessage.toJSON()
        },
        message: 'Conversation created successfully'
      });
    } catch (error) {
      console.error('Error creating conversation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create conversation',
        error: error.message
      });
    }
  }
);

// GET /api/chats/:conversationId - Get a specific conversation with messages
router.get('/:conversationId',
  requireAuth,
  [param('conversationId').isUUID().withMessage('Valid conversation ID is required')],
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

      const { conversationId } = req.params;
      const userId = req.session.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      // Get the conversation and verify user has access
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      // Check if user is participant
      if (conversation.buyer_id !== userId && conversation.seller_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this conversation'
        });
      }

      // Get messages
      const messages = await Message.findByConversationId(conversationId, limit, offset, 'ASC');
      
      // Mark messages as read for the current user
      await Conversation.markAsRead(conversationId, userId);

      // Get conversation details
      const conversationDetails = await Conversation.findByUserId(userId, 1, 0);
      const details = conversationDetails.find(c => c.conversation.id === conversationId);

      res.json({
        success: true,
        data: {
          conversation: conversation.toJSON(),
          details: details ? details.details : null,
          messages: messages
        },
        pagination: {
          page,
          limit,
          hasMore: messages.length === limit
        }
      });
    } catch (error) {
      console.error('Error fetching conversation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch conversation',
        error: error.message
      });
    }
  }
);

// POST /api/chats/:conversationId/messages - Send a message
router.post('/:conversationId/messages',
  requireAuth,
  [
    param('conversationId').isUUID().withMessage('Valid conversation ID is required'),
    body('message').trim().isLength({ min: 1, max: 1000 }).withMessage('Message must be between 1 and 1000 characters'),
    body('message_type').optional().isIn(['text', 'image', 'offer', 'system']).withMessage('Invalid message type')
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

      const { conversationId } = req.params;
      const { message, message_type = 'text', metadata } = req.body;
      const userId = req.session.user.id;

      // Verify conversation exists and user has access
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      if (conversation.buyer_id !== userId && conversation.seller_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this conversation'
        });
      }

      // Create the message
      const newMessage = await Message.create({
        conversation_id: conversationId,
        sender_id: userId,
        message_text: message,
        message_type,
        metadata
      });

      // Send real-time notification via WebSocket
      if (req.app.chatWebSocket) {
        req.app.chatWebSocket.notifyNewMessage(conversationId, {
          id: newMessage.id,
          message_text: newMessage.message_text,
          sender_id: newMessage.sender_id,
          message_type: newMessage.message_type,
          created_at: newMessage.created_at,
          metadata: newMessage.metadata
        });
      }

      res.status(201).json({
        success: true,
        data: newMessage.toJSON(),
        message: 'Message sent successfully'
      });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send message',
        error: error.message
      });
    }
  }
);

// PUT /api/chats/:conversationId/messages/:messageId - Edit a message
router.put('/:conversationId/messages/:messageId',
  requireAuth,
  [
    param('conversationId').isUUID().withMessage('Valid conversation ID is required'),
    param('messageId').isUUID().withMessage('Valid message ID is required'),
    body('message').trim().isLength({ min: 1, max: 1000 }).withMessage('Message must be between 1 and 1000 characters')
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

      const { conversationId, messageId } = req.params;
      const { message, metadata } = req.body;
      const userId = req.session.user.id;

      // Get the message and verify ownership
      const existingMessage = await Message.findById(messageId);
      if (!existingMessage) {
        return res.status(404).json({
          success: false,
          message: 'Message not found'
        });
      }

      if (existingMessage.sender_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only edit your own messages'
        });
      }

      if (existingMessage.conversation_id !== conversationId) {
        return res.status(400).json({
          success: false,
          message: 'Message does not belong to this conversation'
        });
      }

      // Update the message
      const updatedMessage = await Message.updateMessage(messageId, message, metadata);

      res.json({
        success: true,
        data: updatedMessage.toJSON(),
        message: 'Message updated successfully'
      });
    } catch (error) {
      console.error('Error updating message:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update message',
        error: error.message
      });
    }
  }
);

// DELETE /api/chats/:conversationId/messages/:messageId - Delete a message
router.delete('/:conversationId/messages/:messageId',
  requireAuth,
  [
    param('conversationId').isUUID().withMessage('Valid conversation ID is required'),
    param('messageId').isUUID().withMessage('Valid message ID is required')
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

      const { messageId } = req.params;
      const userId = req.session.user.id;

      // Get the message and verify ownership
      const existingMessage = await Message.findById(messageId);
      if (!existingMessage) {
        return res.status(404).json({
          success: false,
          message: 'Message not found'
        });
      }

      if (existingMessage.sender_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own messages'
        });
      }

      // Delete the message
      const deleted = await Message.delete(messageId);

      if (deleted) {
        res.json({
          success: true,
          message: 'Message deleted successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to delete message'
        });
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete message',
        error: error.message
      });
    }
  }
);

// POST /api/chats/:conversationId/read - Mark conversation as read
router.post('/:conversationId/read',
  requireAuth,
  [param('conversationId').isUUID().withMessage('Valid conversation ID is required')],
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

      const { conversationId } = req.params;
      const userId = req.session.user.id;

      // Verify user has access to conversation
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      if (conversation.buyer_id !== userId && conversation.seller_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this conversation'
        });
      }

      const markedCount = await Conversation.markAsRead(conversationId, userId);

      // Send real-time notification via WebSocket
      if (req.app.chatWebSocket && markedCount > 0) {
        req.app.chatWebSocket.notifyMessageRead(conversationId, null, userId);
      }

      res.json({
        success: true,
        data: { markedAsRead: markedCount },
        message: `Marked ${markedCount} messages as read`
      });
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark conversation as read',
        error: error.message
      });
    }
  }
);

// GET /api/chats/unread/count - Get unread message count
router.get('/unread/count', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    const unreadMessages = await Message.getUnreadMessages(userId);
    const totalUnread = unreadMessages.length;
    
    // Group by conversation
    const byConversation = unreadMessages.reduce((acc, item) => {
      const convId = item.message.conversation_id;
      if (!acc[convId]) {
        acc[convId] = {
          conversation_id: convId,
          ad_id: item.ad_id,
          count: 0,
          latest_message: null
        };
      }
      acc[convId].count++;
      if (!acc[convId].latest_message || 
          new Date(item.message.created_at) > new Date(acc[convId].latest_message.created_at)) {
        acc[convId].latest_message = item.message;
      }
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        total_unread: totalUnread,
        by_conversation: Object.values(byConversation)
      }
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
      error: error.message
    });
  }
});

// GET /api/chats/:conversationId/search - Search messages in conversation
router.get('/:conversationId/search',
  requireAuth,
  [
    param('conversationId').isUUID().withMessage('Valid conversation ID is required'),
    body('q').optional().trim().isLength({ min: 1 }).withMessage('Search query must not be empty')
  ],
  async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { q: searchTerm } = req.query;
      const userId = req.session.user.id;
      const limit = parseInt(req.query.limit) || 20;

      if (!searchTerm) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      // Verify user has access to conversation
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      if (conversation.buyer_id !== userId && conversation.seller_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this conversation'
        });
      }

      const results = await Message.searchMessages(conversationId, searchTerm, limit);

      res.json({
        success: true,
        data: {
          search_term: searchTerm,
          results: results,
          count: results.length
        }
      });
    } catch (error) {
      console.error('Error searching messages:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search messages',
        error: error.message
      });
    }
  }
);

module.exports = router;

const WebSocket = require('ws');
const { query } = require('../config/database');
const logger = require('../config/logger');
const { TypingIndicator } = require('../models/ChatEnhancements');

class ChatWebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws/chat'
    });
    
    this.clients = new Map(); // Map of userId -> WebSocket
    this.conversationClients = new Map(); // Map of conversationId -> Set of userIds
    
    this.setupWebSocketServer();
    this.startCleanupInterval();
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      logger.info('New WebSocket connection', {
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      });

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data);
          await this.handleMessage(ws, message);
        } catch (error) {
          logger.error('WebSocket message error', { error: error.message });
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        this.handleDisconnection(ws);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error', { error: error.message });
      });

      // Send connection acknowledgment
      this.sendMessage(ws, {
        type: 'connection',
        status: 'connected',
        timestamp: new Date().toISOString()
      });
    });
  }

  async handleMessage(ws, message) {
    const { type, data } = message;

    switch (type) {
      case 'authenticate':
        await this.handleAuthentication(ws, data);
        break;
        
      case 'join_conversation':
        await this.handleJoinConversation(ws, data);
        break;
        
      case 'leave_conversation':
        await this.handleLeaveConversation(ws, data);
        break;
        
      case 'typing_start':
        await this.handleTypingStart(ws, data);
        break;
        
      case 'typing_stop':
        await this.handleTypingStop(ws, data);
        break;
        
      case 'message_sent':
        await this.handleMessageSent(ws, data);
        break;
        
      case 'message_read':
        await this.handleMessageRead(ws, data);
        break;
        
      case 'heartbeat':
        this.handleHeartbeat(ws);
        break;
        
      default:
        this.sendError(ws, 'Unknown message type');
    }
  }

  async handleAuthentication(ws, data) {
    try {
      const { sessionId, userId } = data;
      
      // Here you would validate the session/token
      // For now, we'll assume it's valid if userId is provided
      if (!userId) {
        this.sendError(ws, 'Authentication failed');
        return;
      }

      ws.userId = userId;
      ws.authenticated = true;
      this.clients.set(userId, ws);

      this.sendMessage(ws, {
        type: 'authenticated',
        userId: userId,
        timestamp: new Date().toISOString()
      });

      logger.info('WebSocket user authenticated', { userId });
      
    } catch (error) {
      logger.error('Authentication error', { error: error.message });
      this.sendError(ws, 'Authentication failed');
    }
  }

  async handleJoinConversation(ws, data) {
    if (!ws.authenticated) {
      this.sendError(ws, 'Not authenticated');
      return;
    }

    try {
      const { conversationId } = data;
      const userId = ws.userId;

      // Verify user has access to conversation
      const result = await query(`
        SELECT * FROM conversations 
        WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2)
      `, [conversationId, userId]);

      if (result.rows.length === 0) {
        this.sendError(ws, 'Access denied to conversation');
        return;
      }

      // Add user to conversation clients
      if (!this.conversationClients.has(conversationId)) {
        this.conversationClients.set(conversationId, new Set());
      }
      this.conversationClients.get(conversationId).add(userId);
      
      ws.currentConversation = conversationId;

      this.sendMessage(ws, {
        type: 'conversation_joined',
        conversationId: conversationId,
        timestamp: new Date().toISOString()
      });

      // Notify other participants that user joined
      this.broadcastToConversation(conversationId, {
        type: 'user_joined_conversation',
        userId: userId,
        conversationId: conversationId,
        timestamp: new Date().toISOString()
      }, userId);

      logger.info('User joined conversation', { userId, conversationId });

    } catch (error) {
      logger.error('Join conversation error', { error: error.message });
      this.sendError(ws, 'Failed to join conversation');
    }
  }

  async handleLeaveConversation(ws, data) {
    if (!ws.authenticated || !ws.currentConversation) {
      return;
    }

    const conversationId = ws.currentConversation;
    const userId = ws.userId;

    // Remove user from conversation clients
    if (this.conversationClients.has(conversationId)) {
      this.conversationClients.get(conversationId).delete(userId);
      
      if (this.conversationClients.get(conversationId).size === 0) {
        this.conversationClients.delete(conversationId);
      }
    }

    ws.currentConversation = null;

    // Stop typing indicator
    await TypingIndicator.setTyping(conversationId, userId, false);

    // Notify other participants
    this.broadcastToConversation(conversationId, {
      type: 'user_left_conversation',
      userId: userId,
      conversationId: conversationId,
      timestamp: new Date().toISOString()
    }, userId);

    logger.info('User left conversation', { userId, conversationId });
  }

  async handleTypingStart(ws, data) {
    if (!ws.authenticated || !ws.currentConversation) {
      return;
    }

    try {
      const conversationId = ws.currentConversation;
      const userId = ws.userId;

      await TypingIndicator.setTyping(conversationId, userId, true);

      this.broadcastToConversation(conversationId, {
        type: 'typing_start',
        userId: userId,
        conversationId: conversationId,
        timestamp: new Date().toISOString()
      }, userId);

    } catch (error) {
      logger.error('Typing start error', { error: error.message });
    }
  }

  async handleTypingStop(ws, data) {
    if (!ws.authenticated || !ws.currentConversation) {
      return;
    }

    try {
      const conversationId = ws.currentConversation;
      const userId = ws.userId;

      await TypingIndicator.setTyping(conversationId, userId, false);

      this.broadcastToConversation(conversationId, {
        type: 'typing_stop',
        userId: userId,
        conversationId: conversationId,
        timestamp: new Date().toISOString()
      }, userId);

    } catch (error) {
      logger.error('Typing stop error', { error: error.message });
    }
  }

  async handleMessageSent(ws, data) {
    if (!ws.authenticated) {
      return;
    }

    try {
      const { conversationId, messageId, messageData } = data;

      // Broadcast new message to conversation participants
      this.broadcastToConversation(conversationId, {
        type: 'new_message',
        conversationId: conversationId,
        messageId: messageId,
        message: messageData,
        timestamp: new Date().toISOString()
      }, ws.userId);

      logger.info('Message broadcasted', { messageId, conversationId });

    } catch (error) {
      logger.error('Message sent error', { error: error.message });
    }
  }

  async handleMessageRead(ws, data) {
    if (!ws.authenticated) {
      return;
    }

    try {
      const { conversationId, messageId } = data;
      const userId = ws.userId;

      // Broadcast read status to conversation participants
      this.broadcastToConversation(conversationId, {
        type: 'message_read',
        conversationId: conversationId,
        messageId: messageId,
        readBy: userId,
        timestamp: new Date().toISOString()
      }, userId);

    } catch (error) {
      logger.error('Message read error', { error: error.message });
    }
  }

  handleHeartbeat(ws) {
    ws.lastHeartbeat = Date.now();
    this.sendMessage(ws, {
      type: 'heartbeat_ack',
      timestamp: new Date().toISOString()
    });
  }

  handleDisconnection(ws) {
    if (ws.userId) {
      this.clients.delete(ws.userId);
      
      if (ws.currentConversation) {
        this.handleLeaveConversation(ws, {});
      }
      
      logger.info('WebSocket user disconnected', { userId: ws.userId });
    }
  }

  broadcastToConversation(conversationId, message, excludeUserId = null) {
    if (!this.conversationClients.has(conversationId)) {
      return;
    }

    const participants = this.conversationClients.get(conversationId);
    
    for (const userId of participants) {
      if (userId !== excludeUserId && this.clients.has(userId)) {
        const client = this.clients.get(userId);
        if (client.readyState === WebSocket.OPEN) {
          this.sendMessage(client, message);
        }
      }
    }
  }

  broadcastToUser(userId, message) {
    if (this.clients.has(userId)) {
      const client = this.clients.get(userId);
      if (client.readyState === WebSocket.OPEN) {
        this.sendMessage(client, message);
      }
    }
  }

  sendMessage(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  sendError(ws, errorMessage) {
    this.sendMessage(ws, {
      type: 'error',
      message: errorMessage,
      timestamp: new Date().toISOString()
    });
  }

  startCleanupInterval() {
    // Clean up inactive connections every minute
    setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  cleanup() {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutes

    for (const [userId, ws] of this.clients.entries()) {
      if (ws.lastHeartbeat && (now - ws.lastHeartbeat) > timeout) {
        logger.info('Cleaning up inactive WebSocket connection', { userId });
        ws.terminate();
        this.clients.delete(userId);
      }
    }

    // Clean up typing indicators
    TypingIndicator.cleanup().catch(error => {
      logger.error('Error cleaning up typing indicators', { error: error.message });
    });
  }

  // Public methods for external use
  notifyNewMessage(conversationId, messageData) {
    this.broadcastToConversation(conversationId, {
      type: 'new_message',
      conversationId: conversationId,
      message: messageData,
      timestamp: new Date().toISOString()
    });
  }

  notifyMessageRead(conversationId, messageId, readBy) {
    this.broadcastToConversation(conversationId, {
      type: 'message_read',
      conversationId: conversationId,
      messageId: messageId,
      readBy: readBy,
      timestamp: new Date().toISOString()
    }, readBy);
  }

  notifyReactionAdded(conversationId, messageId, reaction, userId) {
    this.broadcastToConversation(conversationId, {
      type: 'reaction_added',
      conversationId: conversationId,
      messageId: messageId,
      reaction: reaction,
      userId: userId,
      timestamp: new Date().toISOString()
    }, userId);
  }

  getConnectedUsers() {
    return Array.from(this.clients.keys());
  }

  getConversationParticipants(conversationId) {
    return this.conversationClients.has(conversationId) 
      ? Array.from(this.conversationClients.get(conversationId))
      : [];
  }
}

module.exports = ChatWebSocketServer;

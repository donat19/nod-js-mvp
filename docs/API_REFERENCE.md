# AutoMax API Reference

## Overview

This document provides comprehensive API documentation for the AutoMax car marketplace platform, including authentication, personal ads, real-time chat, and administrative features.

## Base URL
```
http://localhost:3000/api
```

## Authentication

All protected endpoints require authentication via session cookies or JWT tokens.

### Headers
```
Content-Type: application/json
Authorization: Bearer <jwt-token>  // For JWT-based auth
Cookie: session=<session-id>       // For session-based auth
```

## Response Format

All API responses follow this standard format:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* Response data */ },
  "errors": []  // Present only on validation errors
}
```

## Authentication Endpoints

### Send SMS Verification
```http
POST /api/auth/sms/send
```

**Request Body:**
```json
{
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification code sent successfully",
  "data": {
    "phone": "+1234567890",
    "expiresIn": 300
  }
}
```

### Verify SMS Code
```http
POST /api/auth/sms/verify
```

**Request Body:**
```json
{
  "phone": "+1234567890",
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Phone verified successfully",
  "data": {
    "user": {
      "id": "uuid",
      "phone": "+1234567890",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "token": "jwt-token"
  }
}
```

### Get Session Status
```http
GET /api/auth/session
```

**Response:**
```json
{
  "success": true,
  "data": {
    "authenticated": true,
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "phone": "+1234567890"
    }
  }
}
```

### Logout
```http
POST /api/auth/logout
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## User Management Endpoints

### Get User Profile
```http
GET /api/users/profile
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "is_verified": true,
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

### Update User Profile
```http
PUT /api/users/profile
```

**Request Body:**
```json
{
  "name": "John Smith",
  "email": "johnsmith@example.com"
}
```

## Personal Ads Endpoints

### List Personal Ads
```http
GET /api/personal-ads?page=1&limit=20&category=vehicles&make=Honda
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `category` (string): Filter by category
- `subcategory` (string): Filter by subcategory
- `make` (string): Filter by vehicle make
- `model` (string): Filter by vehicle model
- `minPrice` (number): Minimum price filter
- `maxPrice` (number): Maximum price filter
- `city` (string): Filter by city
- `state` (string): Filter by state

**Response:**
```json
{
  "success": true,
  "data": {
    "ads": [
      {
        "id": "uuid",
        "title": "2019 Honda Civic",
        "description": "Excellent condition",
        "price": 18500,
        "category": "vehicles",
        "make": "Honda",
        "model": "Civic",
        "year": 2019,
        "mileage": 25000,
        "images": ["image1.jpg"],
        "city": "Toronto",
        "state": "ON",
        "created_at": "2025-01-01T00:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

### Create Personal Ad
```http
POST /api/personal-ads
```

**Request Body:**
```json
{
  "title": "2019 Honda Civic for Sale",
  "description": "Excellent condition, one owner",
  "category": "vehicles",
  "subcategory": "cars",
  "price": 18500,
  "price_type": "fixed",
  "negotiable": true,
  "make": "Honda",
  "model": "Civic",
  "year": 2019,
  "mileage": 25000,
  "condition": "excellent",
  "city": "Toronto",
  "state": "ON",
  "postal_code": "M1M1M1",
  "contact_method": "both",
  "phone": "+1234567890",
  "features": ["navigation", "backup_camera"]
}
```

### Get Personal Ad Details
```http
GET /api/personal-ads/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "2019 Honda Civic",
    "description": "Excellent condition",
    "price": 18500,
    "images": ["image1.jpg", "image2.jpg"],
    "features": ["navigation", "backup_camera"],
    "seller": {
      "name": "John Doe",
      "phone": "+1234567890"
    },
    "views": 150,
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

### Update Personal Ad
```http
PUT /api/personal-ads/:id
```

**Request Body:** (Same as create, but all fields optional)

### Delete Personal Ad
```http
DELETE /api/personal-ads/:id
```

### Contact Ad Owner
```http
POST /api/personal-ads/:id/contact
```

**Request Body:**
```json
{
  "message": "I'm interested in your vehicle",
  "buyer_name": "Jane Smith",
  "buyer_phone": "+1987654321"
}
```

## Chat System Endpoints

### Get Conversations
```http
GET /api/chats/conversations?limit=20&offset=0
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "ad_id": "uuid",
      "ad_title": "2019 Honda Civic",
      "other_user": {
        "id": "uuid",
        "name": "John Doe"
      },
      "last_message": {
        "text": "Is this still available?",
        "created_at": "2025-01-01T00:00:00Z"
      },
      "unread_count": 2,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### Create Conversation
```http
POST /api/chats/conversations
```

**Request Body:**
```json
{
  "ad_id": "uuid",
  "seller_id": "uuid"
}
```

### Get Messages
```http
GET /api/chats/:conversationId/messages?limit=50&offset=0
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "sender_id": "uuid",
      "sender_name": "John Doe",
      "message_text": "Hello, is this available?",
      "message_type": "text",
      "metadata": null,
      "is_read": true,
      "created_at": "2025-01-01T00:00:00Z",
      "attachments": [],
      "reactions": []
    }
  ]
}
```

### Send Message
```http
POST /api/chats/:conversationId/messages
```

**Request Body:**
```json
{
  "message": "Yes, it's still available!",
  "message_type": "text",
  "metadata": {}
}
```

### Edit Message
```http
PUT /api/chats/:conversationId/messages/:messageId
```

**Request Body:**
```json
{
  "message": "Updated message text",
  "metadata": {}
}
```

### Delete Message
```http
DELETE /api/chats/:conversationId/messages/:messageId
```

### Mark Messages as Read
```http
POST /api/chats/:conversationId/read
```

## Advanced Chat Features

### Upload File Attachment
```http
POST /api/chats/enhanced/attachments
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: File to upload
- `conversation_id`: UUID of conversation

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "file_name": "image.jpg",
    "file_path": "/uploads/chat/optimized_image.webp",
    "file_size": 245760,
    "file_type": "image",
    "mime_type": "image/webp"
  }
}
```

### Add Message Reaction
```http
POST /api/chats/enhanced/reactions
```

**Request Body:**
```json
{
  "message_id": "uuid",
  "reaction_type": "like",
  "emoji": "👍"
}
```

### Get Message Reactions
```http
GET /api/chats/enhanced/reactions/:messageId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reactions": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "user_name": "John Doe",
        "reaction_type": "like",
        "emoji": "👍",
        "created_at": "2025-01-01T00:00:00Z"
      }
    ],
    "summary": {
      "like": 5,
      "love": 2
    }
  }
}
```

### Update Typing Status
```http
POST /api/chats/enhanced/typing
```

**Request Body:**
```json
{
  "conversation_id": "uuid",
  "is_typing": true
}
```

### Get Message Templates
```http
GET /api/chats/enhanced/templates?category=greeting
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Greeting Template",
      "template_text": "Hello! I'm interested in your listing.",
      "category": "greeting",
      "usage_count": 25
    }
  ]
}
```

### Create Message Template
```http
POST /api/chats/enhanced/templates
```

**Request Body:**
```json
{
  "name": "Custom Greeting",
  "template_text": "Hi there! Is this item still available?",
  "category": "greeting"
}
```

### Search Messages
```http
GET /api/chats/enhanced/search?q=honda&conversation_id=uuid&limit=20
```

**Query Parameters:**
- `q` (string, required): Search query
- `conversation_id` (UUID, optional): Limit search to specific conversation
- `date_from` (ISO date, optional): Start date filter
- `date_to` (ISO date, optional): End date filter
- `file_type` (string, optional): Filter by attachment type

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "uuid",
        "conversation_id": "uuid",
        "message_text": "Is the Honda still available?",
        "sender_name": "John Doe",
        "created_at": "2025-01-01T00:00:00Z",
        "rank": 0.5
      }
    ],
    "total": 1
  }
}
```

### Update Conversation Settings
```http
POST /api/chats/enhanced/settings
```

**Request Body:**
```json
{
  "conversation_id": "uuid",
  "notifications_enabled": true,
  "is_muted": false,
  "is_pinned": true,
  "custom_name": "Honda Civic Discussion"
}
```

## WebSocket Events

### Connection
Connect to: `ws://localhost:3000/ws/chat`

### Client to Server Events

#### Authenticate
```json
{
  "type": "authenticate",
  "data": {
    "userId": "uuid",
    "sessionId": "session-id"
  }
}
```

#### Join Conversation
```json
{
  "type": "join_conversation",
  "data": {
    "conversationId": "uuid"
  }
}
```

#### Start Typing
```json
{
  "type": "typing_start",
  "data": {}
}
```

#### Stop Typing
```json
{
  "type": "typing_stop",
  "data": {}
}
```

### Server to Client Events

#### Authentication Confirmed
```json
{
  "type": "authenticated",
  "userId": "uuid",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

#### New Message
```json
{
  "type": "new_message",
  "conversationId": "uuid",
  "message": {
    "id": "uuid",
    "sender_id": "uuid",
    "message_text": "Hello!",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

#### User Typing
```json
{
  "type": "typing_start",
  "userId": "uuid",
  "conversationId": "uuid",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

#### Reaction Added
```json
{
  "type": "reaction_added",
  "conversationId": "uuid",
  "messageId": "uuid",
  "reaction": {
    "type": "like",
    "emoji": "👍",
    "userId": "uuid"
  }
}
```

## Admin Endpoints

### Get All Users (Admin Only)
```http
GET /api/admin/users?page=1&limit=50
```

### Update User Status (Admin Only)
```http
PUT /api/admin/users/:id/status
```

**Request Body:**
```json
{
  "is_active": false
}
```

### Get System Statistics (Admin Only)
```http
GET /api/admin/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_users": 1250,
    "active_conversations": 45,
    "total_messages": 15600,
    "total_ads": 890
  }
}
```

### Send Admin SMS (Admin Only)
```http
POST /api/admin/sms/send
```

**Request Body:**
```json
{
  "phone": "+1234567890",
  "message": "System maintenance scheduled for tonight"
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 200  | Success |
| 201  | Created |
| 400  | Bad Request - Invalid input |
| 401  | Unauthorized - Authentication required |
| 403  | Forbidden - Insufficient permissions |
| 404  | Not Found - Resource doesn't exist |
| 422  | Unprocessable Entity - Validation failed |
| 429  | Too Many Requests - Rate limited |
| 500  | Internal Server Error |

## Rate Limiting

- Authentication endpoints: 10 requests per minute per IP
- Chat endpoints: 100 requests per minute per user
- File uploads: 5 requests per minute per user
- Admin endpoints: 50 requests per minute per admin user

## File Upload Limits

- Maximum file size: 10MB
- Supported image formats: JPEG, PNG, WebP
- Automatic optimization: Images converted to WebP
- Storage location: `public/uploads/chat/`

## Webhooks (Future)

Future webhook endpoints for third-party integrations:
- New message notifications
- Ad status changes
- User registration events

---

*Last updated: August 2025*

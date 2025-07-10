const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');

// Get all users with statistics (admin only)
router.get('/users', authenticateToken, async (req, res) => {
  try {
    // For now, any authenticated user can access admin (you can add role-based access later)
    const currentUser = await User.findById(req.user.id);
    
    if (!currentUser || !currentUser.is_verified) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    // Get all users (including inactive)
    const allUsersQuery = `
      SELECT 
        id, phone, email, name, google_id, 
        is_verified, is_active, created_at, updated_at
      FROM users 
      ORDER BY created_at DESC
    `;
    
    const { query } = require('../config/database');
    const result = await query(allUsersQuery);
    const users = result.rows;
    
    // Calculate statistics
    const stats = {
      total: users.length,
      verified: users.filter(u => u.is_verified && u.is_active).length,
      unverified: users.filter(u => !u.is_verified && u.is_active).length,
      inactive: users.filter(u => !u.is_active).length
    };
    
    res.json({
      users: users,
      stats: stats,
      requestedBy: {
        id: currentUser.id,
        phone: currentUser.phone
      }
    });
    
  } catch (error) {
    console.error('Admin users fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch users data' });
  }
});

// Update user status (activate/deactivate)
router.put('/users/:userId/status', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_active } = req.body;
    
    // Check admin permissions
    const currentUser = await User.findById(req.user.id);
    if (!currentUser || !currentUser.is_verified) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    // Prevent users from deactivating themselves
    if (userId === req.user.id && !is_active) {
      return res.status(400).json({ message: 'You cannot deactivate your own account' });
    }
    
    // Update user status
    const { query } = require('../config/database');
    const result = await query(
      'UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [is_active, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const updatedUser = result.rows[0];
    
    res.json({
      message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: updatedUser.id,
        phone: updatedUser.phone,
        is_active: updatedUser.is_active
      },
      updatedBy: {
        id: currentUser.id,
        phone: currentUser.phone
      }
    });
    
  } catch (error) {
    console.error('Admin user status update error:', error);
    res.status(500).json({ message: 'Failed to update user status' });
  }
});

// Get user details by ID (admin only)
router.get('/users/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check admin permissions
    const currentUser = await User.findById(req.user.id);
    if (!currentUser || !currentUser.is_verified) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        name: user.name,
        google_id: user.google_id,
        is_verified: user.is_verified,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    });
    
  } catch (error) {
    console.error('Admin user fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch user details' });
  }
});

// Get system statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Check admin permissions
    const currentUser = await User.findById(req.user.id);
    if (!currentUser || !currentUser.is_verified) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const { query } = require('../config/database');
    
    // Get user statistics
    const userStatsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_verified = true AND is_active = true) as verified,
        COUNT(*) FILTER (WHERE is_verified = false AND is_active = true) as unverified,
        COUNT(*) FILTER (WHERE is_active = false) as inactive
      FROM users
    `;
    
    // Get registration trends (last 30 days)
    const trendsQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as registrations
      FROM users 
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;
    
    const [userStats, trends] = await Promise.all([
      query(userStatsQuery),
      query(trendsQuery)
    ]);
    
    res.json({
      userStats: userStats.rows[0],
      registrationTrends: trends.rows,
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Admin stats fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch system statistics' });
  }
});

module.exports = router;

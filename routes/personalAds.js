const express = require('express');
const router = express.Router();
const PersonalAd = require('../models/PersonalAd');
const SessionService = require('../services/sessionService');
const { body, validationResult, param, query } = require('express-validator');

// Middleware to require authentication
const requireAuth = async (req, res, next) => {
  if (!SessionService.isLoggedIn(req)) {
    return res.status(401).json({ 
      message: 'Authentication required',
      authenticated: false 
    });
  }
  
  // Load user data into req.user
  req.user = await SessionService.getUserFromSession(req);
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Invalid session',
      authenticated: false 
    });
  }
  
  next();
};

// Validation middleware
const validatePersonalAd = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  body('make')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Make is required and must be valid'),
  body('model')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Model is required'),
  body('year')
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
    .withMessage('Year must be valid'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('mileage')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Mileage must be a positive number'),
  body('condition')
    .optional()
    .isIn(['new', 'used', 'certified'])
    .withMessage('Condition must be new, used, or certified'),
  body('fuel_type')
    .optional()
    .custom((value) => {
      if (!value) return true; // Optional field
      const normalizedValue = value.toLowerCase();
      const validTypes = ['gasoline', 'hybrid', 'electric', 'diesel', 'gas', 'petrol'];
      return validTypes.some(type => normalizedValue.includes(type));
    })
    .withMessage('Invalid fuel type'),
  body('transmission')
    .optional()
    .custom((value) => {
      if (!value) return true; // Optional field
      const normalizedValue = value.toLowerCase();
      return normalizedValue.includes('automatic') || 
             normalizedValue.includes('manual') || 
             normalizedValue.includes('cvt') ||
             normalizedValue.includes('amt');
    })
    .withMessage('Invalid transmission type'),
  body('contact_phone')
    .optional()
    .isLength({ min: 7, max: 20 })
    .withMessage('Contact phone must be between 7 and 20 characters'),
  body('contact_email')
    .optional({ values: 'falsy' })
    .isEmail()
    .withMessage('Contact email must be valid'),
  body('features')
    .optional()
    .isArray()
    .withMessage('Features must be an array'),
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array')
];

// GET /api/personal-ads - Get all active personal ads with search/filter
router.get('/', [
  query('make').optional().trim(),
  query('model').optional().trim(),
  query('minYear').optional().isInt({ min: 1900 }),
  query('maxYear').optional().isInt({ max: new Date().getFullYear() + 1 }),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('condition').optional().isIn(['new', 'used', 'certified']),
  query('fuel_type').optional().custom((value) => {
    if (!value) return true;
    const normalizedValue = value.toLowerCase();
    const validTypes = ['gasoline', 'hybrid', 'electric', 'diesel', 'gas', 'petrol'];
    return validTypes.some(type => normalizedValue.includes(type));
  }),
  query('transmission').optional().custom((value) => {
    if (!value) return true;
    const normalizedValue = value.toLowerCase();
    return normalizedValue.includes('automatic') || 
           normalizedValue.includes('manual') || 
           normalizedValue.includes('cvt') ||
           normalizedValue.includes('amt');
  }),
  query('body_type').optional().trim(),
  query('location_city').optional().trim(),
  query('location_state').optional().trim(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid search parameters',
        errors: errors.array()
      });
    }

    const filters = {
      make: req.query.make,
      model: req.query.model,
      minYear: req.query.minYear ? parseInt(req.query.minYear) : undefined,
      maxYear: req.query.maxYear ? parseInt(req.query.maxYear) : undefined,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined,
      condition: req.query.condition,
      fuel_type: req.query.fuel_type,
      transmission: req.query.transmission,
      body_type: req.query.body_type,
      location_city: req.query.location_city,
      location_state: req.query.location_state,
      features: req.query.features ? JSON.parse(req.query.features) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit) : 20,
      offset: req.query.offset ? parseInt(req.query.offset) : 0
    };

    const ads = await PersonalAd.search(filters);

    res.json({
      success: true,
      data: ads.map(ad => ad.toJSON()),
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total: ads.length
      }
    });
  } catch (error) {
    console.error('Error searching personal ads:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching personal ads'
    });
  }
});

// GET /api/personal-ads/my - Get current user's ads
router.get('/my', requireAuth, async (req, res) => {
  try {
    const ads = await PersonalAd.findByUserId(req.user.id, true);
    
    res.json({
      success: true,
      data: ads.map(ad => ad.toJSON())
    });
  } catch (error) {
    console.error('Error getting user ads:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting your ads'
    });
  }
});

// GET /api/personal-ads/favorites - Get user's favorite ads
router.get('/favorites', requireAuth, async (req, res) => {
  try {
    const favoriteAds = await PersonalAd.getFavoritesByUserId(req.user.id);
    
    res.json({
      success: true,
      data: favoriteAds.map(ad => ad.toJSON())
    });
  } catch (error) {
    console.error('Error getting favorite ads:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting favorite ads'
    });
  }
});

// POST /api/personal-ads - Create new personal ad
router.post('/', requireAuth, validatePersonalAd, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const adData = {
      user_id: req.user.id,
      title: req.body.title,
      make: req.body.make,
      model: req.body.model,
      year: req.body.year,
      price: req.body.price,
      mileage: req.body.mileage,
      condition: req.body.condition || 'used',
      fuel_type: req.body.fuel_type || 'gasoline',
      transmission: req.body.transmission || 'automatic',
      body_type: req.body.body_type,
      exterior_color: req.body.exterior_color,
      interior_color: req.body.interior_color,
      vin: req.body.vin,
      description: req.body.description,
      features: req.body.features || [],
      images: req.body.images || [],
      contact_phone: req.body.contact_phone || req.user.phone,
      contact_email: req.body.contact_email || req.user.email,
      location_city: req.body.location_city,
      location_state: req.body.location_state,
      location_zip: req.body.location_zip,
      is_published: req.body.is_published || false
    };

    const newAd = await PersonalAd.create(adData);

    res.status(201).json({
      success: true,
      message: 'Personal ad created successfully',
      data: newAd.toJSON()
    });
  } catch (error) {
    console.error('Error creating personal ad:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating personal ad'
    });
  }
});

// GET /api/personal-ads/:id - Get specific personal ad
router.get('/:id', [
  param('id').isUUID().withMessage('Invalid ad ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ad ID',
        errors: errors.array()
      });
    }

    const ad = await PersonalAd.findById(req.params.id);
    
    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found'
      });
    }

    // Increment view count if ad is active and published
    if (ad.status === 'active' && ad.is_published) {
      const viewerIp = req.ip;
      const viewerId = req.user ? req.user.id : null;
      await ad.incrementViews(viewerIp, viewerId);
    }

    res.json({
      success: true,
      data: ad.toJSON()
    });
  } catch (error) {
    console.error('Error getting personal ad:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting personal ad'
    });
  }
});

// PUT /api/personal-ads/:id - Update personal ad (owner only)
router.put('/:id', requireAuth, [
  param('id').isUUID().withMessage('Invalid ad ID'),
  ...validatePersonalAd
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const ad = await PersonalAd.findById(req.params.id);
    
    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found'
      });
    }

    // Check if user owns this ad
    if (ad.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own ads'
      });
    }

    // Update ad properties
    Object.assign(ad, {
      title: req.body.title,
      make: req.body.make,
      model: req.body.model,
      year: req.body.year,
      price: req.body.price,
      mileage: req.body.mileage,
      condition: req.body.condition,
      fuel_type: req.body.fuel_type,
      transmission: req.body.transmission,
      body_type: req.body.body_type,
      exterior_color: req.body.exterior_color,
      interior_color: req.body.interior_color,
      vin: req.body.vin,
      description: req.body.description,
      features: req.body.features || [],
      images: req.body.images || [],
      contact_phone: req.body.contact_phone,
      contact_email: req.body.contact_email,
      location_city: req.body.location_city,
      location_state: req.body.location_state,
      location_zip: req.body.location_zip,
      is_published: req.body.is_published
    });

    const updated = await ad.save();
    
    if (updated) {
      res.json({
        success: true,
        message: 'Ad updated successfully',
        data: ad.toJSON()
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to update ad'
      });
    }
  } catch (error) {
    console.error('Error updating personal ad:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating personal ad'
    });
  }
});

// DELETE /api/personal-ads/:id - Delete personal ad (owner only)
router.delete('/:id', requireAuth, [
  param('id').isUUID().withMessage('Invalid ad ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ad ID',
        errors: errors.array()
      });
    }

    const ad = await PersonalAd.findById(req.params.id);
    
    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found'
      });
    }

    // Check if user owns this ad
    if (ad.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own ads'
      });
    }

    await ad.delete();

    res.json({
      success: true,
      message: 'Ad deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting personal ad:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting personal ad'
    });
  }
});

// POST /api/personal-ads/:id/mark-sold - Mark ad as sold (owner only)
router.post('/:id/mark-sold', requireAuth, [
  param('id').isUUID().withMessage('Invalid ad ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ad ID',
        errors: errors.array()
      });
    }

    const ad = await PersonalAd.findById(req.params.id);
    
    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found'
      });
    }

    // Check if user owns this ad
    if (ad.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only modify your own ads'
      });
    }

    await ad.markAsSold();

    res.json({
      success: true,
      message: 'Ad marked as sold',
      data: ad.toJSON()
    });
  } catch (error) {
    console.error('Error marking ad as sold:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking ad as sold'
    });
  }
});

// POST /api/personal-ads/:id/favorite - Add ad to favorites
router.post('/:id/favorite', requireAuth, [
  param('id').isUUID().withMessage('Invalid ad ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ad ID',
        errors: errors.array()
      });
    }

    const ad = await PersonalAd.findById(req.params.id);
    
    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found'
      });
    }

    // Users can't favorite their own ads
    if (ad.user_id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot favorite your own ad'
      });
    }

    await ad.addToFavorites(req.user.id);

    res.json({
      success: true,
      message: 'Ad added to favorites'
    });
  } catch (error) {
    console.error('Error adding ad to favorites:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding ad to favorites'
    });
  }
});

// DELETE /api/personal-ads/:id/favorite - Remove ad from favorites
router.delete('/:id/favorite', requireAuth, [
  param('id').isUUID().withMessage('Invalid ad ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ad ID',
        errors: errors.array()
      });
    }

    const ad = await PersonalAd.findById(req.params.id);
    
    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found'
      });
    }

    await ad.removeFromFavorites(req.user.id);

    res.json({
      success: true,
      message: 'Ad removed from favorites'
    });
  } catch (error) {
    console.error('Error removing ad from favorites:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing ad from favorites'
    });
  }
});

// POST /api/personal-ads/:id/publish - Publish ad (owner only)
router.post('/:id/publish', requireAuth, [
  param('id').isUUID().withMessage('Invalid ad ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ad ID',
        errors: errors.array()
      });
    }

    const ad = await PersonalAd.findById(req.params.id);
    
    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found'
      });
    }

    // Check if user owns this ad
    if (ad.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only publish your own ads'
      });
    }

    await ad.publish();

    res.json({
      success: true,
      message: 'Ad published successfully',
      data: ad.toJSON()
    });
  } catch (error) {
    console.error('Error publishing ad:', error);
    res.status(500).json({
      success: false,
      message: 'Error publishing ad'
    });
  }
});

// POST /api/personal-ads/:id/unpublish - Unpublish ad (owner only)
router.post('/:id/unpublish', requireAuth, [
  param('id').isUUID().withMessage('Invalid ad ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ad ID',
        errors: errors.array()
      });
    }

    const ad = await PersonalAd.findById(req.params.id);
    
    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ad not found'
      });
    }

    // Check if user owns this ad
    if (ad.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only unpublish your own ads'
      });
    }

    await ad.unpublish();

    res.json({
      success: true,
      message: 'Ad unpublished successfully',
      data: ad.toJSON()
    });
  } catch (error) {
    console.error('Error unpublishing ad:', error);
    res.status(500).json({
      success: false,
      message: 'Error unpublishing ad'
    });
  }
});

module.exports = router;

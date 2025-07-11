const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Car = require('../models/Car');
const SessionService = require('../services/sessionService');

// Get all available cars
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const cars = await Car.getAvailable(parseInt(limit), parseInt(offset));
    
    res.json({
      success: true,
      cars: cars.map(car => car.toListingJSON()),
      total: cars.length
    });
  } catch (error) {
    console.error('Error fetching cars:', error);
    res.status(500).json({ message: 'Error fetching cars' });
  }
});

// Get featured cars
router.get('/featured', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const cars = await Car.getFeatured(parseInt(limit));
    
    res.json({
      success: true,
      cars: cars.map(car => car.toListingJSON())
    });
  } catch (error) {
    console.error('Error fetching featured cars:', error);
    res.status(500).json({ message: 'Error fetching featured cars' });
  }
});

// Search cars
router.get('/search', async (req, res) => {
  try {
    const filters = {
      make: req.query.make,
      model: req.query.model,
      year_min: req.query.year_min ? parseInt(req.query.year_min) : undefined,
      year_max: req.query.year_max ? parseInt(req.query.year_max) : undefined,
      price_min: req.query.price_min ? parseFloat(req.query.price_min) : undefined,
      price_max: req.query.price_max ? parseFloat(req.query.price_max) : undefined,
      body_type: req.query.body_type,
      fuel_type: req.query.fuel_type,
      condition: req.query.condition,
      limit: req.query.limit ? parseInt(req.query.limit) : 50,
      offset: req.query.offset ? parseInt(req.query.offset) : 0
    };

    // Remove undefined values
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined || filters[key] === '') {
        delete filters[key];
      }
    });

    const cars = await Car.search(filters);
    
    res.json({
      success: true,
      cars: cars.map(car => car.toListingJSON()),
      filters: filters,
      total: cars.length
    });
  } catch (error) {
    console.error('Error searching cars:', error);
    res.status(500).json({ message: 'Error searching cars' });
  }
});

// Get single car details
router.get('/:id', async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    
    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }
    
    res.json({
      success: true,
      car: car.toJSON()
    });
  } catch (error) {
    console.error('Error fetching car details:', error);
    res.status(500).json({ message: 'Error fetching car details' });
  }
});

// Create new car (admin only - for future use)
router.post('/', [
  body('make').notEmpty().withMessage('Make is required'),
  body('model').notEmpty().withMessage('Model is required'),
  body('year').isInt({ min: 1900, max: new Date().getFullYear() + 2 }).withMessage('Valid year is required'),
  body('price').isFloat({ min: 0 }).withMessage('Valid price is required')
], async (req, res) => {
  try {
    // Check if user is authenticated and is admin
    const user = await SessionService.getUserFromSession(req);
    if (!user || !user.is_admin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const carData = {
      ...req.body,
      created_by: user.id,
      features: Array.isArray(req.body.features) ? req.body.features : [],
      images: Array.isArray(req.body.images) ? req.body.images : []
    };

    const car = await Car.create(carData);
    
    res.status(201).json({
      success: true,
      message: 'Car created successfully',
      car: car.toJSON()
    });
  } catch (error) {
    console.error('Error creating car:', error);
    res.status(500).json({ message: 'Error creating car' });
  }
});

// Update car (admin only - for future use)
router.put('/:id', [
  body('make').optional().notEmpty().withMessage('Make cannot be empty'),
  body('model').optional().notEmpty().withMessage('Model cannot be empty'),
  body('year').optional().isInt({ min: 1900, max: new Date().getFullYear() + 2 }).withMessage('Valid year is required'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Valid price is required')
], async (req, res) => {
  try {
    // Check if user is authenticated and is admin
    const user = await SessionService.getUserFromSession(req);
    if (!user || !user.is_admin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const car = await Car.findById(req.params.id);
    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }

    // Update car properties
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined && key !== 'id') {
        car[key] = req.body[key];
      }
    });

    car.updated_by = user.id;
    await car.save();
    
    res.json({
      success: true,
      message: 'Car updated successfully',
      car: car.toJSON()
    });
  } catch (error) {
    console.error('Error updating car:', error);
    res.status(500).json({ message: 'Error updating car' });
  }
});

// Delete car (admin only - for future use)
router.delete('/:id', async (req, res) => {
  try {
    // Check if user is authenticated and is admin
    const user = await SessionService.getUserFromSession(req);
    if (!user || !user.is_admin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const car = await Car.findById(req.params.id);
    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }

    await car.delete();
    
    res.json({
      success: true,
      message: 'Car deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting car:', error);
    res.status(500).json({ message: 'Error deleting car' });
  }
});

module.exports = router;

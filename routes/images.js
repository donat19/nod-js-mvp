const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// Configure multer for memory storage (we'll process images before saving)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 30 // Maximum 30 files
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Ensure uploads directory exists
const ensureUploadsDir = async () => {
  const uploadsDir = path.join(__dirname, '../public/uploads');
  const carsDir = path.join(uploadsDir, 'cars');
  
  try {
    await fs.access(uploadsDir);
  } catch {
    await fs.mkdir(uploadsDir, { recursive: true });
  }
  
  try {
    await fs.access(carsDir);
  } catch {
    await fs.mkdir(carsDir, { recursive: true });
  }
};

// Image upload endpoint with compression
router.post('/upload-images', upload.array('images', 30), async (req, res) => {
  try {
    await ensureUploadsDir();
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No images uploaded' 
      });
    }

    const uploadedImages = [];
    const errors = [];

    for (let i = 0; i < req.files.length; i++) {
      try {
        const file = req.files[i];
        
        // Generate unique filename
        const timestamp = Date.now();
        const randomString = crypto.randomBytes(8).toString('hex');
        const filename = `car_${timestamp}_${randomString}.webp`;
        const filepath = path.join(__dirname, '../public/uploads/cars', filename);
        
        // Process image with Sharp
        const metadata = await sharp(file.buffer).metadata();
        
        // Determine optimal dimensions (maintain aspect ratio, max 1200px width)
        let width = metadata.width;
        let height = metadata.height;
        
        if (width > 1200) {
          height = Math.round((height * 1200) / width);
          width = 1200;
        }
        
        // Compress and save image
        await sharp(file.buffer)
          .resize(width, height, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp({ 
            quality: 80,
            effort: 4 // Good balance between compression and speed
          })
          .toFile(filepath);
        
        // Get file stats
        const stats = await fs.stat(filepath);
        const originalSize = file.size;
        const compressedSize = stats.size;
        const compressionRatio = Math.round((1 - compressedSize / originalSize) * 100);
        
        uploadedImages.push({
          originalName: file.originalname,
          filename: filename,
          url: `/uploads/cars/${filename}`,
          size: compressedSize,
          originalSize: originalSize,
          compressionRatio: compressionRatio,
          width: width,
          height: height
        });
        
      } catch (error) {
        console.error(`Error processing image ${file.originalname}:`, error);
        errors.push({
          filename: file.originalname,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      message: `Successfully uploaded ${uploadedImages.length} images`,
      images: uploadedImages,
      errors: errors,
      totalUploaded: uploadedImages.length,
      totalErrors: errors.length
    });
    
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload images',
      error: error.message
    });
  }
});

// Delete image endpoint
router.delete('/delete-image/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validate filename (security check)
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename'
      });
    }
    
    const filepath = path.join(__dirname, '../public/uploads/cars', filename);
    
    try {
      await fs.access(filepath);
      await fs.unlink(filepath);
      
      res.json({
        success: true,
        message: 'Image deleted successfully'
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }
    
  } catch (error) {
    console.error('Image deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      error: error.message
    });
  }
});

// Get image info endpoint
router.get('/image-info/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename'
      });
    }
    
    const filepath = path.join(__dirname, '../public/uploads/cars', filename);
    
    try {
      const stats = await fs.stat(filepath);
      const metadata = await sharp(filepath).metadata();
      
      res.json({
        success: true,
        filename: filename,
        url: `/uploads/cars/${filename}`,
        size: stats.size,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        createdAt: stats.birthtime
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }
    
  } catch (error) {
    console.error('Image info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get image info',
      error: error.message
    });
  }
});

module.exports = router;

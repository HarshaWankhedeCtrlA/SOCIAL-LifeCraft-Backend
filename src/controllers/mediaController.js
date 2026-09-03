const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const Media = require('../models/Media');
const { 
  generateThumbnail, 
  getImageDimensions, 
  getFileType,
  validateFile
} = require('../utils/fileHelper');

// ============================================
// UPLOAD SINGLE FILE
// ============================================
exports.uploadSingle = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'No file uploaded'
        }
      });
    }

    const userId = req.user.id;
    const file = req.file;
    const fileType = getFileType(file.mimetype);
    
    // Process file based on type
    let processedFile = {
      url: `/uploads/${fileType === 'image' ? 'images' : 'videos'}/${file.filename}`,
      thumbnailUrl: null,
      width: null,
      height: null,
      duration: null
    };
    
    // Generate thumbnail for images
    if (fileType === 'image') {
      const thumbnailPath = `./uploads/thumbnails/thumb_${file.filename}`;
      const thumbnailGenerated = await generateThumbnail(file.path, thumbnailPath);
      if (thumbnailGenerated) {
        processedFile.thumbnailUrl = `/uploads/thumbnails/thumb_${file.filename}`;
      }
      
      // Get dimensions
      const dimensions = await getImageDimensions(file.path);
      processedFile.width = dimensions.width;
      processedFile.height = dimensions.height;
    }
    
    
    // Save to database
    const media = new Media({
      mediaId: uuidv4(),
      userId,
      fileName: file.filename,
      originalName: file.originalname,
      fileType: fileType,
      mimeType: file.mimetype,
      fileSize: file.size,
      url: processedFile.url,
      thumbnailUrl: processedFile.thumbnailUrl,
      width: processedFile.width,
      height: processedFile.height,
      duration: processedFile.duration,
      status: 'ready',
      processedAt: new Date()
    });
    
    await media.save();
    
    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        media: media.toJSON(),
        fileInfo: {
          originalName: file.originalname,
          size: file.size,
          type: file.mimetype
        }
      }
    });
    
  } catch (error) {
    next(error);
  }
};

// ============================================
// UPLOAD MULTIPLE FILES
// ============================================
exports.uploadMultiple = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILES',
          message: 'No files uploaded'
        }
      });
    }

    const userId = req.user.id;
    const uploadedMedia = [];
    
    for (const file of req.files) {
      const fileType = getFileType(file.mimetype);
      
      // Process file
      let processedFile = {
        url: `/uploads/${fileType === 'image' ? 'images' : 'videos'}/${file.filename}`,
        thumbnailUrl: null,
        width: null,
        height: null,
        duration: null
      };
      
      // Generate thumbnail for images
      if (fileType === 'image') {
        const thumbnailPath = `./uploads/thumbnails/thumb_${file.filename}`;
        const thumbnailGenerated = await generateThumbnail(file.path, thumbnailPath);
        if (thumbnailGenerated) {
          processedFile.thumbnailUrl = `/uploads/thumbnails/thumb_${file.filename}`;
        }
        
        const dimensions = await getImageDimensions(file.path);
        processedFile.width = dimensions.width;
        processedFile.height = dimensions.height;
      }
      
      // Save to database
      const media = new Media({
        mediaId: uuidv4(),
        userId,
        fileName: file.filename,
        originalName: file.originalname,
        fileType: fileType,
        mimeType: file.mimetype,
        fileSize: file.size,
        url: processedFile.url,
        thumbnailUrl: processedFile.thumbnailUrl,
        width: processedFile.width,
        height: processedFile.height,
        status: 'ready',
        processedAt: new Date()
      });
      
      await media.save();
      uploadedMedia.push(media);
    }
    
    res.status(201).json({
      success: true,
      message: `${uploadedMedia.length} files uploaded successfully`,
      data: {
        media: uploadedMedia.map(m => m.toJSON()),
        count: uploadedMedia.length
      }
    });
    
  } catch (error) {
    next(error);
  }
};

// ============================================
// GET USER'S MEDIA
// ============================================
exports.getUserMedia = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { fileType, page = 1, pageSize = 20 } = req.query;
    
    const query = { userId, status: 'ready' };
    if (fileType) query.fileType = fileType;
    
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);
    
    const [media, total] = await Promise.all([
      Media.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Media.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: {
        items: media,
        total,
        page: parseInt(page),
        pageSize: limit,
        totalPages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    next(error);
  }
};

// ============================================
// GET SINGLE MEDIA
// ============================================
exports.getMedia = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const media = await Media.findOne({ mediaId: id });
    if (!media) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MEDIA_NOT_FOUND',
          message: 'Media not found'
        }
      });
    }
    
    // Check ownership
    if (media.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'You do not own this media'
        }
      });
    }
    
    res.json({
      success: true,
      data: media
    });
    
  } catch (error) {
    next(error);
  }
};

// ============================================
// DELETE MEDIA
// ============================================
exports.deleteMedia = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const media = await Media.findOne({ mediaId: id });
    if (!media) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MEDIA_NOT_FOUND',
          message: 'Media not found'
        }
      });
    }
    
    if (media.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'You do not own this media'
        }
      });
    }
    
    // Delete file from disk
    const filePath = `.${media.url}`;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Delete thumbnail if exists
    if (media.thumbnailUrl) {
      const thumbnailPath = `.${media.thumbnailUrl}`;
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }
    }
    
    // Delete from database
    await Media.deleteOne({ _id: media._id });
    
    res.status(204).send();
    
  } catch (error) {
    next(error);
  }
};
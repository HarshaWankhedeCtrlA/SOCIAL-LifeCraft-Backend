const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');

// Ensure upload directories exist
const ensureDirectories = () => {
  const dirs = [
    './uploads',
    './uploads/images',
    './uploads/videos',
    './uploads/thumbnails'
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Generate unique filename
const generateFileName = (originalName, fileType) => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext);
  const sanitized = baseName.replace(/[^a-zA-Z0-9]/g, '_');
  return `${sanitized}_${timestamp}_${random}${ext}`;
};

// Generate thumbnail for image
const generateThumbnail = async (filePath, outputPath) => {
  try {
    await sharp(filePath)
      .resize(300, 300, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toFile(outputPath);
    return true;
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    return false;
  }
};

// Get image dimensions
const getImageDimensions = async (filePath) => {
  try {
    const metadata = await sharp(filePath).metadata();
    return {
      width: metadata.width,
      height: metadata.height
    };
  } catch (error) {
    return { width: null, height: null };
  }
};

// Get file size in KB/MB
const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

// Get file type from mime type
const getFileType = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
};

// Validate file
const validateFile = (file, config) => {
  const errors = [];
  
  // Check file size
  if (file.size > config.maxSize) {
    errors.push(`File size exceeds ${formatFileSize(config.maxSize)} limit`);
  }
  
  // Check file type
  const fileType = getFileType(file.mimetype);
  if (!config.allowedTypes.includes(fileType)) {
    errors.push(`File type "${fileType}" is not allowed`);
  }
  
  return errors;
};

module.exports = {
  ensureDirectories,
  generateFileName,
  generateThumbnail,
  getImageDimensions,
  formatFileSize,
  getFileType,
  validateFile
};
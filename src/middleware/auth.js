const jwt = require('jsonwebtoken');

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication token required'
        }
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    req.user = {
      id: decoded.sub || decoded.userId || decoded.id,
      email: decoded.email,
      roles: decoded.roles || [],
      isPremium: decoded.is_premium || false
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token has expired'
        }
      });
    }
    
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or malformed token'
      }
    });
  }
};

module.exports = { authenticate };
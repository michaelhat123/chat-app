import express from 'express'; // ✅ Added import
import jwt from 'jsonwebtoken';

const router = express.Router(); // ✅ Kept it as requested, even though not used

const auth = (req, res, next) => {
  // Get token from header
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Add user to request
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message); // ✅ Added logging for debugging
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Optional auth - doesn't require authentication, but adds user to request if authenticated
const optionalAuth = (req, res, next) => {
  // Get token from header
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  // If no token, continue without auth
  if (!token) {
    return next();
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Add user to request
    req.user = decoded;
    next();
  } catch (err) {
    console.warn('Optional auth: invalid token:', err.message); // ✅ Added warning for optional case
    // Invalid token - continue without auth
    next();
  }
};

export default auth;
export { optionalAuth }; // ✅ Exported optionalAuth for use elsewhere

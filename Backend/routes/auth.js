import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../modules/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();


router.post('/register', async (req, res, next) => {
  try {
    console.log('📥 Register request body:', req.body);

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: 'Request body is missing or empty' });
    }

    const { email, username, fullName, password } = req.body;
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email
          ? '❌Email already exists. Try a different one.'
          : '❌Username already exists. Try a different one.'
      });
    }

        if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: '❌Password must be at least six characters long.'
      });
    }

    
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);

   if (!hasUpperCase) {
    return res.status(400).json({
      success: false,
      error: ' ❌ Password must contain at least one uppercase letter.'
    });
   }

      if (!hasLowerCase) {
    return res.status(400).json({
      success: false,
      error: ' ❌ Password must contain at least one lowercase letter.'
    });
   }

      if (!hasDigit) {
    return res.status(400).json({
      success: false,
      error: ' ❌ Password must contain at least one digit.'
    });
   }

      if (!hasSpecialChar) {
    return res.status(400).json({
      success: false,
      error: ' ❌ Password must contain at least one special character.'
    });
   }

    const user = new User({
      email,
      username,
      fullName,
      password,
      profileImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`
    });

    await user.save();

    console.log('✅ Registered new user:', user.username);

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        profileImage: user.profileImage
      }
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    console.log('📥 Login request body:', req.body);

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: 'Request body is missing or empty' });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: '❌ Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: '❌ Invalid email or password' });
    }

    user.updateLastActive();

    console.log('✅ User logged in:', user.username);

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        profileImage: user.profileImage
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    // Pass the error to the next middleware for consistent handling
    next(error);
  }
});

// Get current user
router.get('/me', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.updateLastActive();

    console.log('👤 /me fetched:', user.username);

    res.json({
      id: user._id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      profileImage: user.profileImage,
      bio: user.bio,
      website: user.website,
      isVerified: user.isVerified,
      followersCount: user.followers.length,
      followingCount: user.following.length
    });
  } catch (error) {
    console.error('❌ /me error:', error);
    // Pass the error to the next middleware for consistent handling
    next(error);
  }
});

// Logout user
router.post('/logout', auth, async (req, res, next) => {
  try {
    console.log('👋 User logged out:', req.user?.id);
    res.status(200).json({ message: '✅ User Logged Out Successfully' });
  } catch (error) {
    console.error('❌ Logout error:', error);
    next(error);
  }
});

export default router;

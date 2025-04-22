
import express from 'express';
import Reel from '../modules/Reel.js';
import User from '../modules/User.js';
import Comment from '../modules/Comment.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Create a new reel
router.post('/', auth, async (req, res, next) => {
  // Handle file upload in the middleware
  req.upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ])(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    
    try {
      if (!req.files.video || !req.files.thumbnail) {
        return res.status(400).json({ message: 'Video and thumbnail are required' });
      }
      
      const { caption, audioName } = req.body;
      
      // Create new reel
      const reel = new Reel({
        user: req.user.id,
        video: `/uploads/${req.files.video[0].filename}`,
        thumbnail: `/uploads/${req.files.thumbnail[0].filename}`,
        caption,
        audioName: audioName || 'Original Audio'
      });
      
      await reel.save();
      
      // Populate user info
      await reel.populate('user', 'username fullName profileImage');
      
      res.status(201).json({
        ...reel._doc,
        isLiked: false,
        isSaved: false,
        likes: 0,
        comments: []
      });
    } catch (error) {
      next(error);
    }
  });
});

// Get reels feed
router.get('/feed', auth, async (req, res, next) => {
  try {
    // Get reels sorted by recency and popularity
    const reels = await Reel.find({ isArchived: false })
      .sort({ createdAt: -1 })
      .populate('user', 'username fullName profileImage');
    
    // Add isLiked property for the current user
    const currentUser = await User.findById(req.user.id);
    
    const transformedReels = reels.map(reel => {
      const isLiked = reel.likes.includes(req.user.id);
      const isSaved = currentUser.savedPosts.includes(reel._id);
      
      return {
        ...reel._doc,
        isLiked,
        isSaved,
        likes: reel.likes.length,
        comments: reel.comments.length
      };
    });
    
    res.json(transformedReels);
  } catch (error) {
    next(error);
  }
});

// Get a specific reel
router.get('/:id', auth, async (req, res, next) => {
  try {
    const reel = await Reel.findById(req.params.id)
      .populate('user', 'username fullName profileImage')
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
          select: 'username profileImage'
        }
      });
    
    if (!reel) {
      return res.status(404).json({ message: 'Reel not found' });
    }
    
    // Increment view count
    reel.views += 1;
    await reel.save();
    
    // Check if user has liked the reel
    const isLiked = reel.likes.includes(req.user.id);
    
    // Check if user has saved the reel
    const currentUser = await User.findById(req.user.id);
    const isSaved = currentUser.savedPosts.includes(reel._id);
    
    res.json({
      ...reel._doc,
      isLiked,
      isSaved,
      likes: reel.likes.length
    });
  } catch (error) {
    next(error);
  }
});

// Update a reel
router.put('/:id', auth, async (req, res, next) => {
  try {
    const { caption, audioName } = req.body;
    
    const reel = await Reel.findById(req.params.id);
    
    if (!reel) {
      return res.status(404).json({ message: 'Reel not found' });
    }
    
    // Check if user owns the reel
    if (reel.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only update your own reels' });
    }
    
    // Update fields
    if (caption !== undefined) reel.caption = caption;
    if (audioName !== undefined) reel.audioName = audioName;
    
    await reel.save();
    
    res.json(reel);
  } catch (error) {
    next(error);
  }
});

// Delete a reel
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const reel = await Reel.findById(req.params.id);
    
    if (!reel) {
      return res.status(404).json({ message: 'Reel not found' });
    }
    
    // Check if user owns the reel
    if (reel.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own reels' });
    }
    
    // Delete reel
    await Reel.findByIdAndDelete(req.params.id);
    
    // Delete all comments on this reel
    await Comment.deleteMany({ post: req.params.id });
    
    res.json({ message: 'Reel deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Like a reel
router.post('/:id/like', auth, async (req, res, next) => {
  try {
    const reel = await Reel.findById(req.params.id);
    
    if (!reel) {
      return res.status(404).json({ message: 'Reel not found' });
    }
    
    // Check if user already liked the reel
    if (reel.likes.includes(req.user.id)) {
      return res.status(400).json({ message: 'You already liked this reel' });
    }
    
    // Add like
    reel.likes.push(req.user.id);
    await reel.save();
    
    res.json({
      message: 'Reel liked successfully',
      likesCount: reel.likes.length
    });
  } catch (error) {
    next(error);
  }
});

// Unlike a reel
router.post('/:id/unlike', auth, async (req, res, next) => {
  try {
    const reel = await Reel.findById(req.params.id);
    
    if (!reel) {
      return res.status(404).json({ message: 'Reel not found' });
    }
    
    // Check if user has liked the reel
    if (!reel.likes.includes(req.user.id)) {
      return res.status(400).json({ message: 'You have not liked this reel' });
    }
    
    // Remove like
    reel.likes = reel.likes.filter(id => id.toString() !== req.user.id);
    await reel.save();
    
    res.json({
      message: 'Reel unliked successfully',
      likesCount: reel.likes.length
    });
  } catch (error) {
    next(error);
  }
});

// Add view to a reel
router.post('/:id/view', auth, async (req, res, next) => {
  try {
    const reel = await Reel.findById(req.params.id);
    
    if (!reel) {
      return res.status(404).json({ message: 'Reel not found' });
    }
    
    // Increment view count
    reel.views += 1;
    await reel.save();
    
    res.json({
      message: 'View recorded',
      views: reel.views
    });
  } catch (error) {
    next(error);
  }
});

export default router;

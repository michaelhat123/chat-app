
import express from 'express';
import Story from '../modules/Story.js';
import User from '../modules/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Create a new story
router.post('/', auth, async (req, res, next) => {
  // Handle file upload in the middleware
  req.upload.single('media')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No media uploaded' });
      }
      
      const { caption } = req.body;
      const mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
      
      // Create new story
      const story = new Story({
        user: req.user.id,
        media: `/uploads/${req.file.filename}`,
        mediaType,
        caption
      });
      
      await story.save();
      
      // Populate user info
      await story.populate('user', 'username fullName profileImage');
      
      res.status(201).json(story);
    } catch (error) {
      next(error);
    }
  });
});

// Get all stories from users that current user follows
router.get('/feed', auth, async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user.id);
    
    // Get stories from users that current user follows + own stories
    const following = [...currentUser.following, currentUser._id];
    
    // Get active stories (not expired)
    const stories = await Story.find({
      user: { $in: following },
      expiresAt: { $gt: new Date() }
    })
      .populate('user', 'username fullName profileImage')
      .sort({ createdAt: -1 });
    
    // Group stories by user
    const storyMap = new Map();
    
    stories.forEach(story => {
      const userId = story.user._id.toString();
      
      if (!storyMap.has(userId)) {
        storyMap.set(userId, {
          user: {
            id: story.user._id,
            username: story.user.username,
            fullName: story.user.fullName,
            profileImage: story.user.profileImage,
          },
          stories: []
        });
      }
      
      // Add viewed property
      const viewed = story.viewers.some(
        viewer => viewer.user.toString() === req.user.id
      );
      
      storyMap.get(userId).stories.push({
        id: story._id,
        media: story.media,
        mediaType: story.mediaType,
        caption: story.caption,
        timestamp: story.createdAt,
        viewed
      });
    });
    
    // Convert map to array
    const result = Array.from(storyMap.values()).map(userStories => {
      // Check if all stories are viewed
      const allViewed = userStories.stories.every(story => story.viewed);
      
      return {
        ...userStories,
        viewed: allViewed
      };
    });
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get a specific story
router.get('/:id', auth, async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.id)
      .populate('user', 'username fullName profileImage');
    
    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }
    
    // Check if story is expired
    if (story.isExpired()) {
      return res.status(404).json({ message: 'Story has expired' });
    }
    
    // Check if user has permission to view this story
    const storyOwner = await User.findById(story.user);
    
    if (storyOwner.isPrivate && req.user.id !== storyOwner._id.toString()) {
      const currentUser = await User.findById(req.user.id);
      const isFollowing = currentUser.following.includes(storyOwner._id);
      
      if (!isFollowing) {
        return res.status(403).json({ message: 'This story is from a private account' });
      }
    }
    
    // Add this user to viewers if not already viewed
    const alreadyViewed = story.viewers.some(
      viewer => viewer.user.toString() === req.user.id
    );
    
    if (!alreadyViewed && req.user.id !== story.user._id.toString()) {
      story.viewers.push({
        user: req.user.id,
        viewedAt: new Date()
      });
      await story.save();
    }
    
    // Transform response
    const viewed = alreadyViewed || req.user.id === story.user._id.toString();
    
    res.json({
      id: story._id,
      user: {
        id: story.user._id,
        username: story.user.username,
        fullName: story.user.fullName,
        profileImage: story.user.profileImage,
      },
      media: story.media,
      mediaType: story.mediaType,
      caption: story.caption,
      timestamp: story.createdAt,
      viewed,
      viewCount: story.viewers.length
    });
  } catch (error) {
    next(error);
  }
});

// Delete a story
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.id);
    
    if (!story) {
      return res.status(404).json({ message: 'Story not found' });
    }
    
    // Check if user owns the story
    if (story.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own stories' });
    }
    
    // Delete story
    await Story.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Story deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;


import express from 'express';
import User from '../modules/User.js';
import Post from '../modules/Post.js';
import Story from '../modules/Story.js';
import Reel from '../modules/Reel.js';
import auth from '../middleware/auth.js';
import mongoose from 'mongoose';

const router = express.Router();

// Get user by username
router.get('/:username', async (req, res, next) => {
  try {
    const { username } = req.params;
    
    const user = await User.findOne({ username })
      .select('-password -email -savedPosts');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update last active timestamp
    if (req.user && req.user.id === user._id.toString()) {
      user.updateLastActive();
    }
    
    // Check if current user is following this user
    let isFollowing = false;
    if (req.user) {
      const currentUser = await User.findById(req.user.id);
      isFollowing = currentUser.following.includes(user._id);
    }
    
    res.json({
      id: user._id,
      username: user.username,
      fullName: user.fullName,
      profileImage: user.profileImage,
      bio: user.bio,
      website: user.website,
      isVerified: user.isVerified,
      isPrivate: user.isPrivate,
      followersCount: user.followers.length,
      followingCount: user.following.length,
      isFollowing
    });
  } catch (error) {
    next(error);
  }
});

// Get user posts
router.get('/:username/posts', async (req, res, next) => {
  try {
    const { username } = req.params;
    
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if profile is private and user is not followed
    if (user.isPrivate && req.user && req.user.id !== user._id.toString()) {
      const currentUser = await User.findById(req.user.id);
      const isFollowing = currentUser.following.includes(user._id);
      
      if (!isFollowing) {
        return res.status(403).json({ message: 'This account is private' });
      }
    }
    
    const posts = await Post.find({ 
      user: user._id,
      isArchived: false
    })
      .sort({ createdAt: -1 })
      .populate('user', 'username fullName profileImage')
      .populate({
        path: 'comments',
        options: { limit: 2 },
        populate: {
          path: 'user',
          select: 'username'
        }
      });
    
    // Add isLiked and isSaved properties for the current user
    let transformedPosts = posts;
    
    if (req.user) {
      const currentUser = await User.findById(req.user.id);
      
      transformedPosts = posts.map(post => {
        const isLiked = post.likes.includes(req.user.id);
        const isSaved = currentUser.savedPosts.includes(post._id);
        
        return {
          ...post._doc,
          isLiked,
          isSaved,
          likes: post.likes.length
        };
      });
    }
    
    res.json(transformedPosts);
  } catch (error) {
    next(error);
  }
});

// Get user stories
router.get('/:username/stories', auth, async (req, res, next) => {
  try {
    const { username } = req.params;
    
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if profile is private and user is not followed
    if (user.isPrivate && req.user.id !== user._id.toString()) {
      const currentUser = await User.findById(req.user.id);
      const isFollowing = currentUser.following.includes(user._id);
      
      if (!isFollowing) {
        return res.status(403).json({ message: 'This account is private' });
      }
    }
    
    // Get active stories (not expired)
    const stories = await Story.find({
      user: user._id,
      expiresAt: { $gt: new Date() }
    })
      .sort({ createdAt: -1 })
      .populate('user', 'username fullName profileImage');
    
    // Add viewed property
    const transformedStories = stories.map(story => {
      const viewed = story.viewers.some(
        viewer => viewer.user.toString() === req.user.id
      );
      
      return {
        ...story._doc,
        viewed
      };
    });
    
    res.json(transformedStories);
  } catch (error) {
    next(error);
  }
});

// Get user reels
router.get('/:username/reels', async (req, res, next) => {
  try {
    const { username } = req.params;
    
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if profile is private and user is not followed
    if (user.isPrivate && req.user && req.user.id !== user._id.toString()) {
      const currentUser = await User.findById(req.user.id);
      const isFollowing = currentUser.following.includes(user._id);
      
      if (!isFollowing) {
        return res.status(403).json({ message: 'This account is private' });
      }
    }
    
    const reels = await Reel.find({ 
      user: user._id,
      isArchived: false
    })
      .sort({ createdAt: -1 })
      .populate('user', 'username fullName profileImage');
    
    // Add isLiked property for the current user
    let transformedReels = reels;
    
    if (req.user) {
      transformedReels = reels.map(reel => {
        const isLiked = reel.likes.includes(req.user.id);
        
        return {
          ...reel._doc,
          isLiked,
          likes: reel.likes.length
        };
      });
    }
    
    res.json(transformedReels);
  } catch (error) {
    next(error);
  }
});

// Get user saved posts
router.get('/saved-posts', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'savedPosts',
        populate: {
          path: 'user',
          select: 'username fullName profileImage'
        }
      });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Transform posts
    const savedPosts = user.savedPosts.map(post => {
      const isLiked = post.likes.includes(req.user.id);
      
      return {
        ...post._doc,
        isLiked,
        isSaved: true,
        likes: post.likes.length
      };
    });
    
    res.json(savedPosts);
  } catch (error) {
    next(error);
  }
});

// Follow a user
router.post('/:id/follow', auth, async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }
    
    const userToFollow = await User.findById(req.params.id);
    
    if (!userToFollow) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const currentUser = await User.findById(req.user.id);
    
    // Check if already following
    if (currentUser.following.includes(userToFollow._id)) {
      return res.status(400).json({ message: 'You are already following this user' });
    }
    
    // Update current user's following
    currentUser.following.push(userToFollow._id);
    await currentUser.save();
    
    // Update target user's followers
    userToFollow.followers.push(currentUser._id);
    await userToFollow.save();
    
    res.json({
      message: `You are now following ${userToFollow.username}`
    });
  } catch (error) {
    next(error);
  }
});

// Unfollow a user
router.post('/:id/unfollow', auth, async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot unfollow yourself' });
    }
    
    const userToUnfollow = await User.findById(req.params.id);
    
    if (!userToUnfollow) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const currentUser = await User.findById(req.user.id);
    
    // Check if actually following
    if (!currentUser.following.includes(userToUnfollow._id)) {
      return res.status(400).json({ message: 'You are not following this user' });
    }
    
    // Update current user's following
    currentUser.following = currentUser.following.filter(
      id => id.toString() !== userToUnfollow._id.toString()
    );
    await currentUser.save();
    
    // Update target user's followers
    userToUnfollow.followers = userToUnfollow.followers.filter(
      id => id.toString() !== currentUser._id.toString()
    );
    await userToUnfollow.save();
    
    res.json({
      message: `You have unfollowed ${userToUnfollow.username}`
    });
  } catch (error) {
    next(error);
  }
});

// Search users
router.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.json([]);
    }
    
    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { fullName: { $regex: q, $options: 'i' } }
      ]
    })
      .select('username fullName profileImage isVerified')
      .limit(10);
    
    res.json(users);
  } catch (error) {
    next(error);
  }
});

// Update profile
router.put('/profile', auth, async (req, res, next) => {
  try {
    const { fullName, bio, website } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update fields
    if (fullName) user.fullName = fullName;
    if (bio !== undefined) user.bio = bio;
    if (website !== undefined) user.website = website;
    
    await user.save();
    
    res.json({
      id: user._id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      profileImage: user.profileImage,
      bio: user.bio,
      website: user.website,
      isVerified: user.isVerified
    });
  } catch (error) {
    next(error);
  }
});

// Update profile picture
router.put('/profile-picture', auth, async (req, res, next) => {
  // Handle file upload in the middleware
  req.upload.single('profileImage')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Update profile image
      user.profileImage = `/uploads/${req.file.filename}`;
      await user.save();
      
      res.json({
        profileImage: user.profileImage
      });
    } catch (error) {
      next(error);
    }
  });
});

export default router;

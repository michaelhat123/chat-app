
import express from 'express';
import Post from '../modules/Post.js';
import User from '../modules/User.js';
import Comment from '../modules/Comment.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Get feed posts
router.get('/feed', auth, async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user.id);
    
    // Get posts from users that current user follows + own posts
    const following = [...currentUser.following, currentUser._id];
    
    const posts = await Post.find({
      user: { $in: following },
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
    
    // Transform posts
    const transformedPosts = posts.map(post => {
      const isLiked = post.likes.includes(req.user.id);
      const isSaved = currentUser.savedPosts.includes(post._id);
      
      return {
        ...post._doc,
        isLiked,
        isSaved,
        likes: post.likes.length
      };
    });
    
    res.json(transformedPosts);
  } catch (error) {
    next(error);
  }
});

// Get explore posts
router.get('/explore', auth, async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user.id);
    
    // Get posts from users that current user is NOT following
    // and exclude private accounts
    const following = [...currentUser.following, currentUser._id];
    
    const posts = await Post.find({
      user: { $nin: following },
      isArchived: false
    })
      .populate('user', 'username fullName profileImage isPrivate')
      .sort({ createdAt: -1 })
      .limit(30);
    
    // Filter out posts from private accounts
    const publicPosts = posts.filter(post => !post.user.isPrivate);
    
    // Transform posts
    const transformedPosts = publicPosts.map(post => {
      const isLiked = post.likes.includes(req.user.id);
      const isSaved = currentUser.savedPosts.includes(post._id);
      
      return {
        ...post._doc,
        isLiked,
        isSaved,
        likes: post.likes.length,
        comments: post.comments.length
      };
    });
    
    res.json(transformedPosts);
  } catch (error) {
    next(error);
  }
});

// Create a post
router.post('/', auth, async (req, res, next) => {
  // Handle file upload in the middleware
  req.upload.array('images', 10)(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No images uploaded' });
      }
      
      const { caption, location } = req.body;
      
      // Create new post
      const post = new Post({
        user: req.user.id,
        caption,
        location,
        images: req.files.map(file => `/uploads/${file.filename}`)
      });
      
      await post.save();
      
      // Populate user info
      await post.populate('user', 'username fullName profileImage');
      
      res.status(201).json({
        ...post._doc,
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

// Get a post
router.get('/:id', async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'username fullName profileImage')
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
          select: 'username profileImage'
        }
      });
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check if the post is from a private account
    const postUser = await User.findById(post.user);
    
    if (postUser.isPrivate && req.user && req.user.id !== postUser._id.toString()) {
      const currentUser = await User.findById(req.user.id);
      const isFollowing = currentUser.following.includes(postUser._id);
      
      if (!isFollowing) {
        return res.status(403).json({ message: 'This post is from a private account' });
      }
    }
    
    // Transform post
    let transformedPost = { ...post._doc };
    
    if (req.user) {
      const currentUser = await User.findById(req.user.id);
      
      transformedPost = {
        ...post._doc,
        isLiked: post.likes.includes(req.user.id),
        isSaved: currentUser.savedPosts.includes(post._id),
        likes: post.likes.length
      };
    } else {
      transformedPost = {
        ...post._doc,
        isLiked: false,
        isSaved: false,
        likes: post.likes.length
      };
    }
    
    res.json(transformedPost);
  } catch (error) {
    next(error);
  }
});

// Update a post
router.put('/:id', auth, async (req, res, next) => {
  try {
    const { caption, location } = req.body;
    
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check if user owns the post
    if (post.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only update your own posts' });
    }
    
    // Update fields
    if (caption !== undefined) post.caption = caption;
    if (location !== undefined) post.location = location;
    
    await post.save();
    
    res.json(post);
  } catch (error) {
    next(error);
  }
});

// Delete a post
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check if user owns the post
    if (post.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own posts' });
    }
    
    // Delete post
    await Post.findByIdAndDelete(req.params.id);
    
    // Delete all comments on this post
    await Comment.deleteMany({ post: req.params.id });
    
    // Remove post from users' saved posts
    await User.updateMany(
      { savedPosts: req.params.id },
      { $pull: { savedPosts: req.params.id } }
    );
    
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Like a post
router.post('/:id/like', auth, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check if user already liked the post
    if (post.likes.includes(req.user.id)) {
      return res.status(400).json({ message: 'You already liked this post' });
    }
    
    // Add like
    post.likes.push(req.user.id);
    await post.save();
    
    res.json({
      message: 'Post liked successfully',
      likesCount: post.likes.length
    });
  } catch (error) {
    next(error);
  }
});

// Unlike a post
router.post('/:id/unlike', auth, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check if user has liked the post
    if (!post.likes.includes(req.user.id)) {
      return res.status(400).json({ message: 'You have not liked this post' });
    }
    
    // Remove like
    post.likes = post.likes.filter(id => id.toString() !== req.user.id);
    await post.save();
    
    res.json({
      message: 'Post unliked successfully',
      likesCount: post.likes.length
    });
  } catch (error) {
    next(error);
  }
});

// Save a post
router.post('/:id/save', auth, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    const user = await User.findById(req.user.id);
    
    // Check if post already saved
    if (user.savedPosts.includes(req.params.id)) {
      return res.status(400).json({ message: 'Post already saved' });
    }
    
    // Add to saved posts
    user.savedPosts.push(req.params.id);
    await user.save();
    
    res.json({ message: 'Post saved successfully' });
  } catch (error) {
    next(error);
  }
});

// Unsave a post
router.post('/:id/unsave', auth, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    const user = await User.findById(req.user.id);
    
    // Check if post is saved
    if (!user.savedPosts.includes(req.params.id)) {
      return res.status(400).json({ message: 'Post not saved' });
    }
    
    // Remove from saved posts
    user.savedPosts = user.savedPosts.filter(
      id => id.toString() !== req.params.id
    );
    await user.save();
    
    res.json({ message: 'Post removed from saved' });
  } catch (error) {
    next(error);
  }
});

export default router;
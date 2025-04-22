import express from 'express';
import likeModule from '../modules/Likes.js';

const router = express.Router();

// Get all likes
router.get('/', (req, res) => {
  try {
    const likes = likeModule.getAllLikes();
    res.status(200).json(likes);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving likes', error: error.message });
  }
});

// Get likes for a specific post
router.get('/post/:postId', (req, res) => {
  try {
    const postId = req.params.postId;
    const likes = likeModule.getLikesByPostId(postId);
    res.status(200).json(likes);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving likes for post', error: error.message });
  }
});

// Get likes by a specific user
router.get('/user/:userId', (req, res) => {
  try {
    const userId = req.params.userId;
    const likes = likeModule.getLikesByUserId(userId);
    res.status(200).json(likes);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving likes by user', error: error.message });
  }
});

// Create a new like
router.post('/', (req, res) => {
  try {
    const { userId, postId } = req.body;
    
    if (!userId || !postId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Check if user already liked this post
    if (likeModule.hasUserLikedPost(userId, postId)) {
      return res.status(400).json({ message: 'User has already liked this post' });
    }
    
    const newLike = likeModule.createLike({ userId, postId });
    res.status(201).json(newLike);
  } catch (error) {
    res.status(500).json({ message: 'Error creating like', error: error.message });
  }
});

// Unlike a post
router.delete('/:userId/:postId', (req, res) => {
  try {
    const { userId, postId } = req.params;
    
    const deletedLike = likeModule.deleteLike(userId, postId);
    
    if (!deletedLike) {
      return res.status(404).json({ message: 'Like not found' });
    }
    
    res.status(200).json({ message: 'Like removed successfully', deletedLike });
  } catch (error) {
    res.status(500).json({ message: 'Error removing like', error: error.message });
  }
});

// Check if a user has liked a post
router.get('/check/:userId/:postId', (req, res) => {
  try {
    const { userId, postId } = req.params;
    const hasLiked = likeModule.hasUserLikedPost(userId, postId);
    res.status(200).json({ hasLiked });
  } catch (error) {
    res.status(500).json({ message: 'Error checking like status', error: error.message });
  }
});

export default router

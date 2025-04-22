import express from 'express';
import { Router } from 'express';
import followsModule from '../modules/Follows.js';

const router = Router();

// Get all follows
router.get('/', (req, res) => {
  try {
    const follows = followsModule.getAllFollows();
    res.status(200).json(follows);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving follows', error: error.message });
  }
});

// Get followers for a user
router.get('/followers/:userId', (req, res) => {
  try {
    const userId = req.params.userId;
    const followers = followsModule.getFollowers(userId);
    res.status(200).json(followers);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving followers', error: error.message });
  }
});

// Get users that a user is following
router.get('/following/:userId', (req, res) => {
  try {
    const userId = req.params.userId;
    const following = followsModule.getFollowing(userId);
    res.status(200).json(following);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving following', error: error.message });
  }
});

// Check if a user is following another user
router.get('/check/:followerId/:followingId', (req, res) => {
  try {
    const { followerId, followingId } = req.params;
    const isFollowing = followsModule.isFollowing(followerId, followingId);
    res.status(200).json({ isFollowing });
  } catch (error) {
    res.status(500).json({ message: 'Error checking follow status', error: error.message });
  }
});

// Follow a user
router.post('/', (req, res) => {
  try {
    const { followerId, followingId } = req.body;
    
    if (!followerId || !followingId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    if (followerId === followingId) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }
    
    const newFollow = followsModule.createFollow({ followerId, followingId });
    
    if (!newFollow) {
      return res.status(400).json({ message: 'Already following this user' });
    }
    
    res.status(201).json(newFollow);
  } catch (error) {
    res.status(500).json({ message: 'Error creating follow', error: error.message });
  }
});

// Unfollow a user
router.delete('/:followerId/:followingId', (req, res) => {
  try {
    const { followerId, followingId } = req.params;
    
    const deletedFollow = followsModule.deleteFollow(followerId, followingId);
    
    if (!deletedFollow) {
      return res.status(404).json({ message: 'Follow relationship not found' });
    }
    
    res.status(200).json({ message: 'Unfollowed successfully', deletedFollow });
  } catch (error) {
    res.status(500).json({ message: 'Error unfollowing user', error: error.message });
  }
});

// Get suggestions for a user to follow
router.get('/suggestions/:userId', (req, res) => {
  try {
    const userId = req.params.userId;
    const suggestions = followsModule.getSuggestions(userId);
    res.status(200).json(suggestions);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving suggestions', error: error.message });
  }
});

export default router;
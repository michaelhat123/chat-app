
import express from 'express';
import Comment from '../modules/Comment.js';
import Post from '../modules/Post.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Create a comment on a post
router.post('/post/:postId', auth, async (req, res, next) => {
  try {
    const { text } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required' });
    }
    
    const post = await Post.findById(req.params.postId);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Create new comment
    const comment = new Comment({
      user: req.user.id,
      post: req.params.postId,
      text
    });
    
    await comment.save();
    
    // Add comment to post
    post.comments.push(comment._id);
    await post.save();
    
    // Populate user info
    await comment.populate('user', 'username profileImage');
    
    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
});

// Get all comments for a post
router.get('/post/:postId', async (req, res, next) => {
  try {
    const comments = await Comment.find({ 
      post: req.params.postId,
      parent: null // Only get top-level comments
    })
      .sort({ createdAt: 1 })
      .populate('user', 'username profileImage')
      .populate({
        path: 'replies',
        populate: {
          path: 'user',
          select: 'username profileImage'
        }
      });
    
    // Transform comments
    let transformedComments = comments;
    
    if (req.user) {
      transformedComments = comments.map(comment => {
        const isLiked = comment.likes.includes(req.user.id);
        
        // Transform replies too
        const replies = comment.replies.map(reply => {
          const isReplyLiked = reply.likes.includes(req.user.id);
          
          return {
            ...reply._doc,
            isLiked: isReplyLiked,
            likes: reply.likes.length
          };
        });
        
        return {
          ...comment._doc,
          isLiked,
          likes: comment.likes.length,
          replies
        };
      });
    }
    
    res.json(transformedComments);
  } catch (error) {
    next(error);
  }
});

// Reply to a comment
router.post('/:commentId/reply', auth, async (req, res, next) => {
  try {
    const { text } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Reply text is required' });
    }
    
    const parentComment = await Comment.findById(req.params.commentId);
    
    if (!parentComment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    // Create new reply
    const reply = new Comment({
      user: req.user.id,
      post: parentComment.post,
      text,
      parent: parentComment._id
    });
    
    await reply.save();
    
    // Add reply to parent comment
    parentComment.replies.push(reply._id);
    await parentComment.save();
    
    // Populate user info
    await reply.populate('user', 'username profileImage');
    
    res.status(201).json(reply);
  } catch (error) {
    next(error);
  }
});

// Update a comment
router.put('/:id', auth, async (req, res, next) => {
  try {
    const { text } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required' });
    }
    
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    // Check if user owns the comment
    if (comment.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only update your own comments' });
    }
    
    // Update comment
    comment.text = text;
    await comment.save();
    
    res.json(comment);
  } catch (error) {
    next(error);
  }
});

// Delete a comment
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    // Check if user owns the comment or the post
    const post = await Post.findById(comment.post);
    
    if (comment.user.toString() !== req.user.id && post.user.toString() !== req.user.id) {
      return res.status(403).json({ 
        message: 'You can only delete your own comments or comments on your posts' 
      });
    }
    
    // If it's a parent comment, delete all replies
    if (!comment.parent) {
      await Comment.deleteMany({ parent: comment._id });
    } else {
      // If it's a reply, remove from parent's replies list
      await Comment.findByIdAndUpdate(
        comment.parent,
        { $pull: { replies: comment._id } }
      );
    }
    
    // Remove from post's comments list
    await Post.findByIdAndUpdate(
      comment.post,
      { $pull: { comments: comment._id } }
    );
    
    // Delete the comment
    await Comment.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Like a comment
router.post('/:id/like', auth, async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    // Check if user already liked the comment
    if (comment.likes.includes(req.user.id)) {
      return res.status(400).json({ message: 'You already liked this comment' });
    }
    
    // Add like
    comment.likes.push(req.user.id);
    await comment.save();
    
    res.json({
      message: 'Comment liked successfully',
      likesCount: comment.likes.length
    });
  } catch (error) {
    next(error);
  }
});

// Unlike a comment
router.post('/:id/unlike', auth, async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    // Check if user has liked the comment
    if (!comment.likes.includes(req.user.id)) {
      return res.status(400).json({ message: 'You have not liked this comment' });
    }
    
    // Remove like
    comment.likes = comment.likes.filter(id => id.toString() !== req.user.id);
    await comment.save();
    
    res.json({
      message: 'Comment unliked successfully',
      likesCount: comment.likes.length
    });
  } catch (error) {
    next(error);
  }
});

export default router;

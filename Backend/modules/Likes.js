// Models for likes data
const likes = [
    { id: 1, userId: 2, postId: 1, timestamp: new Date().getTime() - 2 * 60 * 60 * 1000 },
    { id: 2, userId: 3, postId: 1, timestamp: new Date().getTime() - 3 * 60 * 60 * 1000 },
    { id: 3, userId: 5, postId: 1, timestamp: new Date().getTime() - 5 * 60 * 60 * 1000 },
    { id: 4, userId: 1, postId: 2, timestamp: new Date().getTime() - 1 * 60 * 60 * 1000 },
    { id: 5, userId: 4, postId: 2, timestamp: new Date().getTime() - 2 * 24 * 60 * 60 * 1000 },
  ];
  
  // Helper function to generate a new ID
  const generateId = () => {
    return likes.length > 0 ? Math.max(...likes.map(like => like.id)) + 1 : 1;
  };
  
  // Get all likes
  const getAllLikes = () => {
    return likes;
  };
  
  // Get likes by post ID
  const getLikesByPostId = (postId) => {
    return likes.filter(like => like.postId === parseInt(postId));
  };
  
  // Get likes by user ID
  const getLikesByUserId = (userId) => {
    return likes.filter(like => like.userId === parseInt(userId));
  };
  
  // Create a new like
  const createLike = (likeData) => {
    const newLike = {
      id: generateId(),
      userId: parseInt(likeData.userId),
      postId: parseInt(likeData.postId),
      timestamp: new Date().getTime()
    };
    
    likes.push(newLike);
    return newLike;
  };
  
  // Delete a like (when a user unlikes a post)
  const deleteLike = (userId, postId) => {
    const index = likes.findIndex(
      like => like.userId === parseInt(userId) && like.postId === parseInt(postId)
    );
    
    if (index !== -1) {
      const deletedLike = likes[index];
      likes.splice(index, 1);
      return deletedLike;
    }
    
    return null;
  };
  
  // Check if a user has liked a post
  const hasUserLikedPost = (userId, postId) => {
    return likes.some(
      like => like.userId === parseInt(userId) && like.postId === parseInt(postId)
    );
  };
  
  export default {
    getAllLikes,
    getLikesByPostId,
    getLikesByUserId,
    createLike,
    deleteLike,
    hasUserLikedPost
  };
  
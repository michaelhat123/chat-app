// Models for follows data
const follows = [
    { id: 1, followerId: 1, followingId: 2 },
    { id: 2, followerId: 1, followingId: 3 },
    { id: 3, followerId: 1, followingId: 5 },
    { id: 4, followerId: 2, followingId: 1 },
    { id: 5, followerId: 3, followingId: 1 },
    { id: 6, followerId: 4, followingId: 1 },
    { id: 7, followerId: 5, followingId: 1 },
  ];
  
  // Helper function to generate a new ID
  const generateId = () => {
    return follows.length > 0 ? Math.max(...follows.map(follow => follow.id)) + 1 : 1;
  };
  
  // Get all follows
  const getAllFollows = () => {
    return follows;
  };
  
  // Get followers for a user (people who follow the user)
  const getFollowers = (userId) => {
    return follows.filter(follow => follow.followingId === parseInt(userId));
  };
  
  // Get following for a user (people the user follows)
  const getFollowing = (userId) => {
    return follows.filter(follow => follow.followerId === parseInt(userId));
  };
  
  // Check if a user is following another user
  const isFollowing = (followerId, followingId) => {
    return follows.some(
      follow => follow.followerId === parseInt(followerId) && follow.followingId === parseInt(followingId)
    );
  };
  
  // Create a new follow relationship
  const createFollow = (followData) => {
    // Check if this relationship already exists
    if (isFollowing(followData.followerId, followData.followingId)) {
      return null; // Already following
    }
    
    const newFollow = {
      id: generateId(),
      followerId: parseInt(followData.followerId),
      followingId: parseInt(followData.followingId)
    };
    
    follows.push(newFollow);
    return newFollow;
  };
  
  // Delete a follow relationship (unfollow)
  const deleteFollow = (followerId, followingId) => {
    const index = follows.findIndex(
      follow => follow.followerId === parseInt(followerId) && follow.followingId === parseInt(followingId)
    );
    
    if (index !== -1) {
      const deletedFollow = follows[index];
      follows.splice(index, 1);
      return deletedFollow;
    }
    
    return null;
  };
  
  // Get suggestions for a user to follow
  const getSuggestions = (userId) => {
    // Get IDs of users the current user is already following
    const followingIds = follows
      .filter(follow => follow.followerId === parseInt(userId))
      .map(follow => follow.followingId);
    
    // Get unique user IDs from the follows data
    const allUserIds = [...new Set([
      ...follows.map(follow => follow.followerId),
      ...follows.map(follow => follow.followingId)
    ])];
    
    // Filter out users that the current user is already following and the user themselves
    const suggestions = allUserIds.filter(id => 
      id !== parseInt(userId) && !followingIds.includes(id)
    );
    
    return suggestions;
  };
  
  export default {
    getAllFollows,
    getFollowers,
    getFollowing,
    isFollowing,
    createFollow,
    deleteFollow,
    getSuggestions
  };
  
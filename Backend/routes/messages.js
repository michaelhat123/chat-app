
import express from 'express';
import Conversation from '../modules/Conversation.js';
import Message from '../modules/Message.js';
import User from '../modules/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Get all conversations for the current user
router.get('/conversations', auth, async (req, res, next) => {
  try {
    // Find all conversations that include the current user
    const conversations = await Conversation.find({
      participants: req.user.id,
      isActive: true
    })
      .populate('participants', 'username fullName profileImage lastActive')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });
    
    // Transform conversations
    const transformedConversations = conversations.map(conversation => {
      // Filter out current user from participants
      const otherParticipants = conversation.participants.filter(
        participant => participant._id.toString() !== req.user.id
      );
      
      // For direct messages, just get the other user
      // For group chats, return all participants
      const user = conversation.isGroup ? otherParticipants : otherParticipants[0];
      
      // Calculate unread count
      let unreadCount = 0;
      if (conversation.lastMessage) {
        // Check if user has read the last message
        const isRead = conversation.lastMessage.readBy.some(
          reader => reader.user.toString() === req.user.id
        );
        
        if (!isRead && conversation.lastMessage.sender.toString() !== req.user.id) {
          unreadCount = 1;
        }
      }
      
      return {
        id: conversation._id,
        user: {
          id: user._id,
          username: user.username,
          fullName: user.fullName,
          profileImage: user.profileImage,
          isOnline: user.lastActive > new Date(Date.now() - 5 * 60 * 1000), // 5 minutes
          lastActive: user.lastActive
        },
        lastMessage: conversation.lastMessage ? {
          text: conversation.lastMessage.text,
          timestamp: conversation.lastMessage.createdAt,
          isRead: conversation.lastMessage.readBy.some(
            reader => reader.user.toString() === req.user.id
          ),
          isSent: conversation.lastMessage.sender.toString() === req.user.id
        } : null,
        unreadCount
      };
    });
    
    res.json(transformedConversations);
  } catch (error) {
    next(error);
  }
});

// Get messages in a conversation
router.get('/conversations/:id', auth, async (req, res, next) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('participants', 'username fullName profileImage lastActive');
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    // Check if user is part of this conversation
    if (!conversation.participants.some(p => p._id.toString() === req.user.id)) {
      return res.status(403).json({ message: 'You are not part of this conversation' });
    }
    
    // Filter out current user from participants
    const otherParticipants = conversation.participants.filter(
      participant => participant._id.toString() !== req.user.id
    );
    
    // For direct messages, just get the other user
    // For group chats, return all participants
    const user = conversation.isGroup ? otherParticipants : otherParticipants[0];
    
    // Get messages
    const messages = await Message.find({
      conversation: req.params.id,
      isDeleted: false
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'username profileImage');
    
    // Mark messages as read
    const unreadMessages = messages.filter(
      message => 
        message.sender._id.toString() !== req.user.id && 
        !message.readBy.some(reader => reader.user.toString() === req.user.id)
    );
    
    if (unreadMessages.length > 0) {
      await Promise.all(
        unreadMessages.map(message => message.markAsRead(req.user.id))
      );
    }
    
    const transformedMessages = messages.map(message => ({
      id: message._id,
      senderId: message.sender._id,
      text: message.text,
      media: message.media,
      mediaType: message.mediaType,
      timestamp: message.createdAt,
      isRead: message.readBy.some(reader => reader.user.toString() !== req.user.id)
    }));
    
    res.json({
      id: conversation._id,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        profileImage: user.profileImage,
        isOnline: user.lastActive > new Date(Date.now() - 5 * 60 * 1000), // 5 minutes
        lastActive: user.lastActive
      },
      isGroup: conversation.isGroup,
      groupName: conversation.groupName,
      messages: transformedMessages
    });
  } catch (error) {
    next(error);
  }
});

// Create or get a conversation with another user
router.post('/conversations/user/:userId', auth, async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Cannot create conversation with yourself' });
    }
    
    // Check if user exists
    const otherUser = await User.findById(userId);
    
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get or create conversation
    const conversation = await Conversation.getOrCreateConversation([req.user.id, userId]);
    
    res.json({
      id: conversation._id,
      participants: conversation.participants
    });
  } catch (error) {
    next(error);
  }
});

// Send a message
router.post('/conversations/:id/messages', auth, async (req, res, next) => {
  try {
    const { text } = req.body;
    
    if (!text && !req.file) {
      return res.status(400).json({ message: 'Message content is required' });
    }
    
    const conversation = await Conversation.findById(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    // Check if user is part of this conversation
    if (!conversation.participants.some(p => p.toString() === req.user.id)) {
      return res.status(403).json({ message: 'You are not part of this conversation' });
    }
    
    // Create new message
    const message = new Message({
      conversation: req.params.id,
      sender: req.user.id,
      text,
      media: req.file ? `/uploads/${req.file.filename}` : null,
      mediaType: req.file ? 
        (req.file.mimetype.startsWith('image/') ? 'image' : 
          (req.file.mimetype.startsWith('video/') ? 'video' : 'audio')) : 
        null,
      readBy: [{ user: req.user.id }] // Mark as read by sender
    });
    
    await message.save();
    
    // Update conversation's last message
    conversation.lastMessage = message._id;
    await conversation.save();
    
    // Populate sender info
    await message.populate('sender', 'username profileImage');
    
    res.status(201).json({
      id: message._id,
      senderId: message.sender._id,
      text: message.text,
      media: message.media,
      mediaType: message.mediaType,
      timestamp: message.createdAt,
      isRead: false
    });
  } catch (error) {
    next(error);
  }
});

// Send a media message
router.post('/conversations/:id/media', auth, async (req, res, next) => {
  // Handle file upload in the middleware
  req.upload.single('media')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Media file is required' });
      }
      
      const { text } = req.body;
      const conversation = await Conversation.findById(req.params.id);
      
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      
      // Check if user is part of this conversation
      if (!conversation.participants.some(p => p.toString() === req.user.id)) {
        return res.status(403).json({ message: 'You are not part of this conversation' });
      }
      
      // Determine media type
      let mediaType = null;
      if (req.file.mimetype.startsWith('image/')) {
        mediaType = 'image';
      } else if (req.file.mimetype.startsWith('video/')) {
        mediaType = 'video';
      } else if (req.file.mimetype.startsWith('audio/')) {
        mediaType = 'audio';
      }
      
      // Create new message
      const message = new Message({
        conversation: req.params.id,
        sender: req.user.id,
        text,
        media: `/uploads/${req.file.filename}`,
        mediaType,
        readBy: [{ user: req.user.id }] // Mark as read by sender
      });
      
      await message.save();
      
      // Update conversation's last message
      conversation.lastMessage = message._id;
      await conversation.save();
      
      // Populate sender info
      await message.populate('sender', 'username profileImage');
      
      res.status(201).json({
        id: message._id,
        senderId: message.sender._id,
        text: message.text,
        media: message.media,
        mediaType: message.mediaType,
        timestamp: message.createdAt,
        isRead: false
      });
    } catch (error) {
      next(error);
    }
  });
});

// Delete a message
router.delete('/messages/:id', auth, async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Check if user owns the message
    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }
    
    // Soft delete the message
    message.isDeleted = true;
    message.text = 'This message has been deleted';
    message.media = null;
    message.mediaType = null;
    await message.save();
    
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
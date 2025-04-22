
import mongoose from 'mongoose';

const ConversationSchema = new mongoose.Schema({
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },
  isGroup: {
    type: Boolean,
    default: false,
  },
  groupName: {
    type: String,
    default: '',
  },
  groupAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

// Get or create conversation between users
ConversationSchema.statics.getOrCreateConversation = async function(userIds) {
  if (!Array.isArray(userIds) || userIds.length < 2) {
    throw new Error('At least two users are required for a conversation');
  }
  
  // Sort userIds to ensure consistent lookup
  const sortedUserIds = [...userIds].sort();
  
  // Check if conversation already exists
  let conversation = await this.findOne({
    participants: { $all: sortedUserIds, $size: sortedUserIds.length },
    isGroup: false
  });
  
  // If not, create a new one
  if (!conversation) {
    conversation = await this.create({
      participants: sortedUserIds,
      isGroup: false
    });
  }
  
  return conversation;
};

export default mongoose.model('Conversation', ConversationSchema);  


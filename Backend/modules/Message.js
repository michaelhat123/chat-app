import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    trim: true,
  },
  media: {
    type: String,
  },
  mediaType: {
    type: String,
    enum: ['image', 'video', 'audio', null],
    default: null,
  },
  readBy: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      readAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  isDeleted: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

// ❌ Fix: Remove `.method()` — it’s incorrect on virtuals
// ✅ Instead, create a real method and just use that directly
// OR you can create a virtual getter only if you're returning a property

// 🛠️ Option 1 (preferred): Just define it as a method like below 👇
MessageSchema.methods.isReadBy = function(userId) {
  return this.readBy.some(reader => reader.user.toString() === userId.toString());
};

// ✅ Mark message as read
MessageSchema.methods.markAsRead = function(userId) {
  if (!this.isReadBy(userId)) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
    return this.save();
  }
  return this;
};

export default mongoose.model('Message', MessageSchema);

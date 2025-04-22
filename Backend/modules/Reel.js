
import mongoose from 'mongoose';

const ReelSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  video: {
    type: String,
    required: true,
  },
  thumbnail: {
    type: String,
    required: true,
  },
  caption: {
    type: String,
    default: '',
  },
  audioName: {
    type: String,
    default: 'Original Audio',
  },
  audioOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: function() {
      return this.user;
    }
  },
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  comments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
    },
  ],
  views: {
    type: Number,
    default: 0,
  },
  shares: {
    type: Number,
    default: 0,
  },
  isArchived: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

// Virtual for like count
ReelSchema.virtual('likesCount').get(function() {
  return this.likes.length;
});

// Virtual for comment count
ReelSchema.virtual('commentsCount').get(function() {
  return this.comments.length;
});

export default mongoose.model('Reel', ReelSchema);

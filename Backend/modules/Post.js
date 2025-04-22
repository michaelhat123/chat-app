
import mongoose from 'mongoose';

const PostSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  caption: {
    type: String,
    default: '',
    maxlength: 2200,
  },
  images: [
    {
      type: String,
      required: true,
    },
  ],
  location: {
    type: String,
    default: '',
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
  tags: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  isArchived: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

// Virtual for like count
PostSchema.virtual('likesCount').get(function() {
  return this.likes.length;
});

// Virtual for comment count
PostSchema.virtual('commentsCount').get(function() {
  return this.comments.length;
});

export default mongoose.model('Post', PostSchema);  

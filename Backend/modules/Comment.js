import mongoose from 'mongoose';


const CommentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
  },
  replies: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
    },
  ],
}, { timestamps: true });

// Virtual for like count
CommentSchema.virtual('likesCount').get(function() {
  return this.likes.length;
});

// Virtual for reply count
CommentSchema.virtual('repliesCount').get(function() {
  return this.replies.length;
});

export default mongoose.model('Comment', CommentSchema);


import mongoose from 'mongoose';

const StorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  media: {
    type: String,
    required: true,
  },
  mediaType: {
    type: String,
    enum: ['image', 'video'],
    required: true,
  },
  caption: {
    type: String,
    default: '',
  },
  viewers: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      viewedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  expiresAt: {
    type: Date,
    required: true,
    default: function() {
      // Stories expire after 24 hours
      const date = new Date();
      date.setHours(date.getHours() + 24);
      return date;
    }
  },
}, { timestamps: true });

// Virtual for view count
StorySchema.virtual('viewCount').get(function() {
  return this.viewers.length;
});

// Method to check if story is expired
StorySchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Remove expired stories
StorySchema.statics.removeExpiredStories = async function() {
  return this.deleteMany({ expiresAt: { $lt: new Date() } });
};

export default mongoose.model('Story', StorySchema);  


import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  profileImage: {
    type: String,
    default: 'default-profile.jpg',
  },
  bio: {
    type: String,
    default: '',
    maxlength: 150,
  },
  website: {
    type: String,
    default: '',
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  isPrivate: {
    type: Boolean,
    default: false,
  },
  followers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  following: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  savedPosts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
    },
  ],
  lastActive: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Pre-save hook to hash password
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Virtual for follower count
UserSchema.virtual('followersCount').get(function() {
  return this.followers.length;
});

// Virtual for following count
UserSchema.virtual('followingCount').get(function() {
  return this.following.length;
});

// Update lastActive timestamp
UserSchema.methods.updateLastActive = function() {
  this.lastActive = Date.now();
  return this.save();
};

export default mongoose.model('User', UserSchema);    

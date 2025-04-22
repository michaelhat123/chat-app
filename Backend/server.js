import express, { json } from 'express';
import { static as serveStatic } from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import morgan from 'morgan';
import { join, dirname } from 'path';
import multer, { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { ENV_VARS } from './config/config.js';
import connectDB from './config/db.js';

// ✅ Fix __dirname in ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config();

// Create Express app
const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(cors({
  origin: '*', // ⚠️ Corrected origin to match likely frontend port
  credentials: true
}));

// Serve static files
app.use('/uploads', serveStatic(join(__dirname, 'uploads')));

// File uploads setup
const storage = diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    cb(null, `${uuidv4()}.${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/jpeg' ||
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'video/mp4'
  ) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file format'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter
});

// Attach multer to request
app.use((req, res, next) => {
  req.upload = upload;
  next();
});

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import postRoutes from './routes/posts.js';
import commentRoutes from './routes/comments.js';
import likeRoutes from './routes/like.js';
import followRoutes from './routes/follow.js';
import storyRoutes from './routes/stories.js';
import reelRoutes from './routes/reels.js';
import messageRoutes from './routes/messages.js';
import resetRoutes from './routes/reset.js';
import searchRoutes from './routes/search.js';

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/reels', reelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reset', resetRoutes);
app.use('/api/search', searchRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    stack: ENV_VARS.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Connect to MongoDB and start server
connectDB()
  .then(() => {
    app.listen(ENV_VARS.PORT, () => {
      console.log(`✅ Server Running On Port ${ENV_VARS.PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ DB Connection Failed:', error);
    process.exit(1);
  });
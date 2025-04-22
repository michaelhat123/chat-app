import express from 'express';
const router = express.Router();
import User from '../modules/User.js';

router.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { fullName: { $regex: q, $options: 'i' } }
      ]
    })
      .select('username fullName profileImage isVerified')
      .limit(10);
    res.json(users);
  } catch (error) {
    next(error);
  }
});

export default router;
import express from 'express';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import User from '../modules/User.js';
import { ENV_VARS } from '../config/config.js';

const router = express.Router();

// --- TEST EMAIL FUNCTION ---
router.get('/test-email', async (req, res) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'Gmail', // Change this if you're not using Gmail
      auth: {
        user: ENV_VARS.EMAIL,
        pass: ENV_VARS.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: ENV_VARS.EMAIL,
      to: ENV_VARS.EMAIL, // Sending to yourself for testing
      subject: 'Test Email from Your Backend',
      text: 'This is a test email to check if nodemailer is working!',
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Test email sent:', info);
    res.status(200).json({ message: 'Test email sent successfully', info: info });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ message: 'Error sending test email', error: error.message });
  }
});

// Generate a reset token and send it to the user's email
router.post('/', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // Token valid for 1 hour

    // Save the token and expiry to the user's record
    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    // Send the reset token to the user's email
    const transporter = nodemailer.createTransport({
      service: 'Gmail', // Make sure this matches your actual service
      auth: {
        user: ENV_VARS.EMAIL,
        pass: ENV_VARS.EMAIL_PASSWORD,
      },
    });

    const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;
    const mailOptions = {
      from: ENV_VARS.EMAIL,
      to: user.email,
      subject: 'Password Reset Request',
      html: `<p>You requested a password reset. Click the link below to reset your password:</p>
                  <a href="${resetUrl}">${resetUrl}</a>
                  <p>If you did not request this, please ignore this email.</p>`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
});

// Reset the user's password using the token
router.post('/reset/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    // Find the user by the reset token and ensure the token is not expired
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }, // Ensure the token is still valid
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Update the user's password and clear the reset token
    user.password = password; // Ensure you hash the password in your User model's pre-save hook
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
});

export default router;
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { asyncHandler } from '../lib/asyncHandler';
import { sendPasswordResetEmail } from '../lib/email';

const router = Router();

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:4200';

/** POST /api/auth/forgot-password */
router.post('/forgot-password', asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string };
  if (!email) return res.status(400).json({ error: 'Email is required', status: 400 });

  const user = await User.findOne({ email: email.toLowerCase() });

  // Always respond with success to avoid user enumeration
  if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

  const token = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  const resetUrl = `${CLIENT_URL}/reset-password?token=${token}`;
  await sendPasswordResetEmail(user.email, resetUrl);

  res.json({ message: 'If that email exists, a reset link has been sent.' });
}));

/** POST /api/auth/reset-password */
router.post('/reset-password', asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body as { token?: string; password?: string };
  if (!token || !password) {
    return res.status(400).json({ error: 'Token and password are required', status: 400 });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters', status: 400 });
  }

  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) return res.status(400).json({ error: 'Reset link is invalid or has expired', status: 400 });

  user.passwordHash = await bcrypt.hash(password, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ message: 'Password reset successfully. You can now log in.' });
}));

export default router;

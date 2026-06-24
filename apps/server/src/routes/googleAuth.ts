import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User';
import { signToken, signRefreshToken } from '../lib/auth';
import { seedDefaultBuckets } from '../db';
import { asyncHandler } from '../lib/asyncHandler';
import type { AuthResponse, User as UserDTO } from '@dwexpense/types';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const router = Router();

function toDTO(u: InstanceType<typeof User>): UserDTO {
  return {
    _id: u._id.toString(),
    email: u.email,
    name: u.name,
    monthlySalary: u.monthlySalary,
    savingsGoal: u.savingsGoal,
    theme: u.theme,
    currency: u.currency ?? 'USD',
    createdAt: u.createdAt.toISOString(),
  };
}

/** POST /api/auth/google — exchange Google ID token for app JWT */
router.post('/google', asyncHandler(async (req: Request, res: Response) => {
  const { idToken } = req.body as { idToken?: string };
  if (!idToken) return res.status(400).json({ error: 'idToken is required', status: 400 });

  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload?.email) return res.status(400).json({ error: 'Invalid Google token', status: 400 });

  const { email, name, sub: googleId } = payload;

  let user = await User.findOne({ $or: [{ googleId }, { email: email.toLowerCase() }] });

  if (!user) {
    user = await User.create({
      email: email.toLowerCase(),
      name: name ?? '',
      passwordHash: '',
      googleId,
    });
    await seedDefaultBuckets(user._id);
  } else if (!user.googleId) {
    user.googleId = googleId;
    await user.save();
  }

  const uid = user._id.toString();
  const body: AuthResponse = {
    token: signToken(uid),
    refreshToken: signRefreshToken(uid),
    user: toDTO(user),
  };
  res.json(body);
}));

export default router;

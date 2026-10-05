import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import User, { IUser } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser;
}

interface JwtPayload {
  userId: string;
  email: string;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    // Check Authorization header (Bearer <token>)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      // Check HTTP-only cookie
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User account not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid authentication token.' });
    }
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ error: 'Authentication server error' });
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

// PATTERN: Token Verification Middleware
// WHY: Validate JWT tokens for protected routes
// CONCEPT: Stateless authentication verification

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided'
      });
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Token is valid
    return res.status(200).json({
      valid: true,
      user: {
        userId: decoded.userId,
        email: decoded.email,
        username: decoded.username,
        skillLevel: decoded.skillLevel,
        preferredLanguage: decoded.preferredLanguage,
      },
      expiresAt: new Date(decoded.exp * 1000).toISOString(),
    });

  } catch (error) {
    console.error('Token verification error:', error);

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: 'Token expired',
        valid: false
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: 'Invalid token',
        valid: false
      });
    }

    return res.status(500).json({
      error: 'Internal server error'
    });
  }
}
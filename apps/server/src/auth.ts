/**
 * JWT auth for ClassSync. One token format serves both the REST API
 * (Authorization: Bearer header) and the socket.io handshake (auth.token).
 */
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role, User } from '@classsync/common';

const SECRET = process.env.AUTH_SECRET ?? 'classsync-dev-secret';
if (!process.env.AUTH_SECRET) {
  console.warn(
    '[auth] AUTH_SECRET not set — using the built-in dev secret. Set AUTH_SECRET in production.',
  );
}

const TOKEN_TTL = '12h';

export interface TokenPayload {
  sub: string;
  role: Role;
  name: string;
}

export function signToken(user: User): string {
  const payload: TokenPayload = { sub: user.id, role: user.role, name: user.name };
  return jwt.sign(payload, SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

// Augment Express requests with the authenticated user.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Express middleware: requires a valid Bearer token whose role is in `roles`.
 * 401 when missing/invalid, 403 when authenticated with the wrong role.
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    const payload = token ? verifyToken(token) : null;
    if (!payload) {
      res.status(401).json({ error: 'authentication required' });
      return;
    }
    if (!roles.includes(payload.role)) {
      res.status(403).json({ error: 'insufficient role for this resource' });
      return;
    }
    req.user = payload;
    next();
  };
}

/** Verify the token a socket presented in `handshake.auth.token`. */
export function socketUser(handshakeAuth: unknown): TokenPayload | null {
  const token =
    handshakeAuth && typeof handshakeAuth === 'object'
      ? (handshakeAuth as Record<string, unknown>).token
      : undefined;
  if (typeof token !== 'string' || !token) return null;
  return verifyToken(token);
}

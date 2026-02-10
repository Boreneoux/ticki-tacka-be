import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { jwtVerifyToken } from '../helpers/jwt.helper';
import { JWT_SECRET_TOKEN } from '../config/main.config';
import { Role } from '../generated/prisma/client';

interface JwtPayload {
  id: string;
  email: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const verifyToken = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const token = req.cookies?.accessToken;

  if (!token) {
    return next(new AppError('Authentication required', 401));
  }

  try {
    const decoded = jwtVerifyToken(token, JWT_SECRET_TOKEN!) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    return next(new AppError('Invalid or expired token', 401));
  }
};

export const roleGuard = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};

import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { Role } from "@prisma/client";
import { ForbiddenError } from "../utils/errors";

export interface AuthUser {
  userId: string;
  institutionId: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(user: AuthUser): string {
  return jwt.sign(user, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

// Server-side auth — every mutating route depends on this, never on a client-supplied role or
// institutionId. The JWT payload is the only source of truth for who the actor is.
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new ForbiddenError("Fehlender oder ungültiger Authorization-Header");
  }
  try {
    const payload = jwt.verify(header.slice(7), env.jwtSecret) as AuthUser;
    req.user = payload;
    next();
  } catch {
    throw new ForbiddenError("Ungültiges oder abgelaufenes Token");
  }
}

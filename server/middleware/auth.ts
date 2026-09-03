import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { userRepository, UserRow } from "../db/repository";

export interface AuthenticatedRequest extends Request {
  seller?: UserRow;
}

/**
 * In-memory token blocklist for logout.
 * Tokens are stored until their natural expiry.
 * For a multi-server deployment, replace with Redis.
 */
const revokedTokens = new Set<string>();

export function revokeToken(token: string): void {
  revokedTokens.add(token);
}

export function generateToken(user: UserRow): string {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
    },
    config.jwtSecret,
    { expiresIn: "30d" }
  );
}

export function requireSellerAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required. Please sign in to your seller studio." });
    return;
  }

  const token = authHeader.split(" ")[1];

  // Check if this token has been explicitly revoked (logged out)
  if (revokedTokens.has(token)) {
    res.status(401).json({ error: "Session has been revoked. Please sign in again." });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string; role: string };
    const user = userRepository.findById(decoded.id);
    if (!user) {
      res.status(401).json({ error: "Artisan account not found or session has expired." });
      return;
    }
    if (user.role !== "seller" && user.role !== "admin") {
      res.status(403).json({ error: "Access denied. Only registered artisans and sellers can access this studio." });
      return;
    }
    req.seller = user;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired session token. Please sign in again." });
  }
}

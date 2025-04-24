import * as express from "express";
import * as jwt from "jsonwebtoken";
import { User } from "@prisma/client";

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

interface JWTPayload {
  userId: string;
  id: string;
  content: string;
  role: string;
  doctorId?: string; // For clinic users
  clinicId?: string; // For clinic users
  email: string;
  patientId?: string; // For patient users
  name: string;
  age: string;
  gender: string;
  contact: string;
  referral: string;
  aadharCard: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

type Request = express.Request;
type Response = express.Response;
type NextFunction = express.NextFunction;

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    ) as JWTPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const authorize = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };
};

export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // Your authentication logic here

  const user = req.body;
  console.log(req.user, "user in authMiddleware");
  req.user = user;
  next();
};

import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { type JwtPayloadCustom } from "@/types/index.js";

/* interface TokenPayload extends JwtPayload {
  id: string;
  phone?: string;
  email?: string;
} */

/* export interface AuthRequest extends Request {
  user?: TokenPayload;
} */

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    res.json({
      code: 1,
      codeText: "Login expired, please log in again.",
    });
    return;
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET,
    ) as JwtPayloadCustom;
    req.user = decoded; // 把解析出來的 id 和 phone 塞進 req 給後面的路由用
    next();
  } catch (err) {
    res.json({
      code: 1,
      codeText: "The token is invalid or has expired.",
    });
  }
};

export const optionalAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET,
    ) as JwtPayloadCustom;

    req.user = decoded;
    
  } catch {
    // token無效不報錯，當作未登入處理
  }
  next();
};

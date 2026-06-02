import type { JwtPayloadCustom } from "@/types";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production";
      PORT?: string;
      MONGO_URI: string;
      NEWS_API_KEY: string;
      JWT_SECRET: string;
      JWT_MAX_AGE: number;
      CLOUDINARY_CLOUD_NAME: string;
      CLOUDINARY_API_KEY: string;
      CLOUDINARY_API_SECRET: string;
      CLOUDINARY_API_ENV_VARIABLE: string;
      MAIL_USER: string;
      MAIL_PASS: string;
      GOOGLE_CLIENT_ID: string;
      GOOGLE_SECRET_ID: string;
      GUARDIAN_API_KEY: string;
      FREENEWSAPI_IO_KEY: string;
      NEWSDATA_IO_KEY: string;
      BREVO_API_KEY: string;
    }
  }
  namespace Express {
    interface Request {
      user?: JwtPayloadCustom
    }
  }
}

export {}; // 確保這是一個module

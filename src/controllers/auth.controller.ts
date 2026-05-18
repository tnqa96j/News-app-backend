import { type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { otpService } from "@/services/otpService.js";
import { mailService } from "@/services/emailService.js";
import UserCollection from "@/models/User.js";
import { type ApiResponse, type JwtPayloadCustom } from "@/types/index.js";
import { parsePhoneNumberFromString, PhoneNumber } from "libphonenumber-js";
import { googleService } from "@/services/googleService.js";

const DEFAULT_AVATAR =
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQm5tted-DahbZzzQpY_j86IkVkACqCFcMKVA&s";

export const authController = {
  async sendEmailOtp(req: Request, res: Response<ApiResponse>): Promise<void> {
    const { email } = req.body as { email?: string };

    // 基本格式驗證
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.json({
        code: 1,
        codeText: "Please enter a valid email address.",
      });
      return;
    }

    try {
      const code = otpService.generateOtp(email);
      await mailService.sendOtp(email, code);

      res.json({ code: 0, codeText: "Verification code has been sent" });
    } catch (error) {
      console.error("sendEmailOtp error:", error);
      res.json({
        code: 1,
        codeText: "Email failed to send, please try again later.",
      });
    }
  },
  async emailLogin(
    req: Request,
    res: Response<ApiResponse<{ token: string }>>,
  ): Promise<void> {
    const { email, code } = req.body as { email?: string; code?: string };

    if (!email || !code) {
      res.json({
        code: 1,
        codeText: "Missing necessary fields",
      });
      return;
    }

    // 驗證
    if (!otpService.verifyOtp(email, code)) {
      res.json({
        code: 1,
        codeText: "The verification code is incorrect or has expired.",
      });
      return;
    }

    try {
      let isNewUser = false;
      let user = await UserCollection.findOne({ email });

      if (!user) {
        user = await UserCollection.create({
          email,
          name: `User_${email.split("@")[0]?.slice(0, 6)}`,
          pic: DEFAULT_AVATAR,
        });
        isNewUser = true;
      }

      // JWT
      const payload: JwtPayloadCustom = {
        id: user._id.toString(),
        email,
      };
      // 注意expiresIn接收字串或數字（秒）
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_MAX_AGE
          ? Number(process.env.JWT_MAX_AGE)
          : "7d",
      });

      res.json({
        code: 0,
        codeText: isNewUser
          ? "Register and login successfully"
          : "Login successfully",
        data: { token },
      });
    } catch (error) {
      res.json({
        code: 1,
        codeText: "Server error",
      });
    }
  },
  async sendPhoneOtp(req: Request, res: Response<ApiResponse>): Promise<void> {
    const { phone } = req.body as { phone?: string };
    if (!phone) {
      res.json({ code: 1, codeText: "Missing phone number" });
      return;
    }
    // 基本格式驗證
    const phoneNumber: PhoneNumber | undefined =
      parsePhoneNumberFromString(phone);
    if (!phoneNumber || !phoneNumber?.isValid()) {
      res.json({
        code: 1,
        codeText: "Please enter a valid phone number.",
      });
      return;
    }

    try {
      const formatPhone = phoneNumber.format("E.164");
      const code = otpService.generateOtp(formatPhone);

      res.json({
        code: 0,
        codeText: `Phone Number: ${formatPhone}, Verify code: ${code}`,
      });
    } catch (error) {
      res.json({
        code: 1,
        codeText: "Failed to generate verify code, please try again later.",
      });
    }
  },
  async phoneLogin(
    req: Request,
    res: Response<ApiResponse<{ token: string }>>,
  ): Promise<void> {
    const { phone, code } = req.body as { phone?: string; code?: string };

    if (!phone || !code) {
      res.json({
        code: 1,
        codeText: "Missing necessary fields",
      });
      return;
    }

    const phoneNumber = parsePhoneNumberFromString(phone);
    if (!phoneNumber?.isValid()) {
      res.json({ code: 1, codeText: "Invalid phone number" });
      return;
    }

    const formatPhone = phoneNumber?.format("E.164");

    // 驗證
    if (!otpService.verifyOtp(formatPhone, code)) {
      res.json({
        code: 1,
        codeText: "The verification code is incorrect or has expired.",
      });
      return;
    }

    try {
      let isNewUser = false;
      let user = await UserCollection.findOne({ phone: formatPhone });

      if (!user) {
        user = await UserCollection.create({
          phone: formatPhone,
          name: `User_${formatPhone.slice(-4)}`,
          pic: DEFAULT_AVATAR,
        });
        isNewUser = true;
      }

      // JWT
      const payload: JwtPayloadCustom = {
        id: user._id.toString(),
        phone,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_MAX_AGE
          ? Number(process.env.JWT_MAX_AGE)
          : "7d",
      });

      res.json({
        code: 0,
        codeText: isNewUser
          ? "Register and login successfully"
          : "Login successfully",
        data: { token },
      });
    } catch (error) {
      res.json({
        code: 1,
        codeText: "Server error",
      });
    }
  },
  async googleLogin(
    req: Request,
    res: Response<ApiResponse<{ token: string }>>,
  ): Promise<void> {
    const { code } = req.body as { code?: string };

    if (!code) {
      res.json({
        code: 1,
        codeText: "Missing authorization code",
      });
      return;
    }

    try {
      // Google驗證這個authorization code，拿到使用者資訊
      const googleUser = await googleService.getUserInfoFromCode(code);

      let isNewUser = false;
      let user = await UserCollection.findOne({
        googleId: googleUser.googleId,
      });

      if (!user) {
        // 第一次用Google登入，檢查之前是否email otp login過
        user = await UserCollection.findOne({ email: googleUser.email });

        if (user) {
          user.googleId = googleUser.googleId;
          if (!user.pic) user.pic = googleUser.pic;
          await user.save(); // = 發出UPDATE指令到MongoDB
        } else {
          user = await UserCollection.create({
            googleId: googleUser.googleId,
            email: googleUser.email,
            name: googleUser.name,
            pic: googleUser.pic,
          });
          isNewUser = true;
        }
      }

      // JWT
      const payload: JwtPayloadCustom = {
        id: user._id.toString(),
        email: user.email ?? "",
      };
    
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_MAX_AGE
          ? Number(process.env.JWT_MAX_AGE)
          : "7d",
      });

      res.json({
        code: 0,
        codeText: isNewUser
          ? "Register and login successfully"
          : "Login successfully",
        data: { token },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Google login failed";
      res.json({
        code: 1,
        codeText: message,
      });
    }
  },
};

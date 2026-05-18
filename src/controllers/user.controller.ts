import { type Request, type Response } from "express";
import { type ApiResponse } from "@/types/index.js";
import UserCollection, { type IUser } from "@/models/User.js";
import { z } from "zod";

const UpdateProfileSchema = z
  .object({
    name: z
      .string()
      .min(1, "Username cannot be empty")
      .max(20, "Username must be 20 characters or less")
      .optional(),
    pic: z.url("Invalid image URL").optional(),
  })
  .refine((data) => data.name !== undefined || data.pic !== undefined, {
    error: "At least one field (name or pic) is required",
  });

export const userController = {
  // GET /api/user/info
  async getUserInfo(req: Request, res: Response<ApiResponse<IUser>>) {
    try {
      const user = await UserCollection.findById(req.user.id).select("-__v");
      if (!user) {
        res.json({ code: 1, codeText: "User not found" });
        return;
      }
      res.json({ code: 0, codeText: "", data: user });
    } catch (error) {
      res.json({ code: 1, codeText: "Server error" });
    }
  },
  // PATCH /api/user/info
  async updateUserUnfo(
    req: Request,
    res: Response<ApiResponse<IUser>>,
  ): Promise<void> {
    const result = UpdateProfileSchema.safeParse(req.body);
    if (!result.success) {
      res.json({
        code: 1,
        codeText: result.error.issues[0]?.message || "params format incorrect",
      });
      return;
    }

    const { name, pic } = result.data;

    try {
      const updatedUser = await UserCollection.findByIdAndUpdate(
        req.user.id,
        {
          $set: { ...(name && { name }), ...(pic && { pic }) },
        },
        { returnDocument: "after" },
      ).lean<IUser>();

      if (!updatedUser) {
        res.json({ code: 1, codeText: "params format incorrect" });
        return;
      }
      res.json({
        code: 0,
        codeText: "Profile updated successfully",
        data: updatedUser,
      });
    } catch (error) {
      res.json({ code: 1, codeText: "Server error" });
    }
  },
  // POST /api/user/avatar
  async uploadAvatar(
    req: Request,
    res: Response<ApiResponse<{ pic: string }>>,
  ): Promise<void> {
    try {
      // multer處理完上傳的圖片後，圖片檔案資訊在req.file
      const file = req.file as Express.Multer.File & { path: string };
      if (!file?.path) {
        res.json({ code: 1, codeText: "Image upload failed" });
        return;
      }

      res.json({
        code: 0,
        codeText: "Image uploaded successfully",
        data: { pic: file.path },
      });
    } catch (error) {
      res.json({
        code: 1,
        codeText: "Server error",
      });
    }
  },
};

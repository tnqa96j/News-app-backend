import { Router } from "express";
import { authMiddleware } from "@/middlewares/auth.js";
import { userController } from "@/controllers/user.controller.js";
import { favoritesController } from "@/controllers/favorites.controller.js";
import { subscriptionsController } from "@/controllers/subscriptions.controller.js";
import { uploader } from "@/config/cloudinary.js";
const router = Router();

// info
router.get("/info", authMiddleware, userController.getUserInfo); // 取得使用者資訊
router.patch("/info", authMiddleware, userController.updateUserUnfo); // 修改用戶資訊
router.post(
  "/avatar",
  authMiddleware,
  uploader.single("file"), // file是前端FormData的欄位名稱
  userController.uploadAvatar,
); // 上傳大頭貼

// Favorites
router.get(
  "/favorites/:newsId",
  authMiddleware,
  favoritesController.checkFavorite,
); // 確認使用者是否收藏該篇新聞
router.get("/favorites", authMiddleware, favoritesController.getFavoritesList); // 獲取使用者收藏新聞列表
router.post("/favorites", authMiddleware, favoritesController.addToFavorites); // 將該筆新聞加入收藏列表
router.delete(
  "/favorites/:newsId",
  authMiddleware,
  favoritesController.removeFromFavorites,
); // 將該筆新聞移除收藏列表

// Subscriptions
router.get(
  "/subscriptions/:sourceId",
  authMiddleware,
  subscriptionsController.checkSubscribe,
);
router.get(
  "/subscriptions",
  authMiddleware,
  subscriptionsController.getSubscription,
);
router.post(
  "/subscriptions",
  authMiddleware,
  subscriptionsController.addToSubscription,
);
router.delete(
  "/subscriptions/:sourceId",
  authMiddleware,
  subscriptionsController.removeFromSubscription,
);

export default router;

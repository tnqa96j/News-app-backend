import { Router } from "express";
import { commentsController } from "@/controllers/comment.controller.js";
import { authMiddleware } from "@/middlewares/auth.js";

const router = Router();

router.patch("/:commentId", authMiddleware, commentsController.updateComment); // 編輯留言
router.delete("/:commentId", authMiddleware, commentsController.deleteComment); // 刪除留言
router.post(
  "/:commentId/reaction",
  authMiddleware,
  commentsController.handleReaction,
); // 按讚/倒讚

export default router;

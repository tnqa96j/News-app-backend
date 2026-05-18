import { Router } from "express";
import { newsController } from "@/controllers/news.controller.js";
import { commentsController } from "@/controllers/comment.controller.js";
import { authMiddleware, optionalAuthMiddleware } from "@/middlewares/auth.js";

const router = Router();
// News
router.get("/", newsController.getNews);
router.get("/:newsId", newsController.getNewsDetailById);

// Comments of News
router.get(
  "/:newsId/comments",
  optionalAuthMiddleware,
  commentsController.readComments,
);
router.post(
  "/:newsId/comments",
  authMiddleware,
  commentsController.createComment,
);

export default router;

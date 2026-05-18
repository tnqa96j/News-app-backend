import { type Request, type Response } from "express";
import { type UpdateQuery } from "mongoose";
import { z } from "zod";
import CommentsCollection, { type IComment } from "@/models/Comment.js";
import { PaginationWithSortSchema } from "@/schemas/pagination.schema.js";
import type {
  ApiResponse,
  CommentListData,
  PopulatdReplyUser,
  PopulatedComment,
  PopulatedUser,
  ProcessedComment,
  ReactionResult,
} from "@/types/index.js";

const GetCommemtsSchema = PaginationWithSortSchema.extend({
  parentCommentId: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val === "" || !val ? null : val)),
});

const CreateCommentSchema = z.object({
  params: z.object({
    newsId: z.string().min(1, "newsId is required"),
  }),
  body: z.object({
    content: z
      .string()
      .min(1, "Content cannot be empty")
      .max(500, "Content is too long"),
    parentCommentId: z
      .string()
      .optional()
      .nullable()
      .transform((val) => (val === "" || !val ? null : val)),
    replyToUserId: z
      .string()
      .optional()
      .nullable()
      .transform((val) => (val === "" || !val ? null : val)),
  }),
});

const UpdateCommentSchema = z.object({
  params: z.object({ commentId: z.string().min(1, "commentId is required") }),
  body: z.object({
    content: z
      .string()
      .min(1, "Content cannot be empty")
      .max(500, "Content is too long"),
  }),
});

const HandleReactionSchema = z.object({
  params: z.object({ commentId: z.string().min(1, "commentId is required") }),
  body: z.object({
    type: z.preprocess(
      (val) => Number(val),
      z.union([z.literal(1), z.literal(0), z.literal(-1)]),
    ),
  }),
});

export const commentsController = {
  // POST /api/news/:newsId/comments
  async createComment(
    req: Request,
    res: Response<ApiResponse<IComment>>,
  ): Promise<void> {
    try {
      const result = CreateCommentSchema.safeParse({
        params: req.params,
        body: req.body,
      });

      if (!result.success) {
        res.json({
          code: 1,
          codeText:
            result.error.issues[0]?.message || "params format incorrect",
        });
        return;
      }

      const {
        params: { newsId },
        body: { content, replyToUserId, parentCommentId },
      } = result.data;

      // 有parentCommentId => 先確認父留言存在，在建立回覆
      if (parentCommentId) {
        const parentExist = await CommentsCollection.exists({
          _id: parentCommentId,
        });
        if (!parentExist) {
          res.json({ code: 1, codeText: "Parent comment not found" });
          return;
        }
      }

      // 建立新留言
      const newComment = await CommentsCollection.create({
        userId: req.user.id,
        newsId,
        content,
        parentCommentId,
        replyToUserId,
      });

      // 若是樓中樓回覆，更新父留言的replyCount
      if (parentCommentId) {
        await CommentsCollection.findByIdAndUpdate(parentCommentId, {
          $inc: { replyCount: 1 },
        });
      }

      res.json({
        code: 0,
        codeText: "Add a new comment successfully",
        data: newComment,
      });
    } catch (error) {
      res.json({ code: 1, codeText: "Server error" });
    }
  },
  // PATCH /api/comments/:commentId
  async updateComment(req: Request, res: Response<ApiResponse>): Promise<void> {
    const result = UpdateCommentSchema.safeParse({
      params: req.params,
      body: req.body,
    });

    if (!result.success) {
      res.json({
        code: 1,
        codeText: result.error.issues[0]?.message || "params format incorrect",
      });
      return;
    }

    const {
      params: { commentId },
      body: { content },
    } = result.data;

    try {
      // 找到該留言並更新
      const updated = await CommentsCollection.findOneAndUpdate(
        {
          _id: commentId,
          userId: req.user.id,
        },
        {
          content: content.trim(),
          isEdited: true,
        },
        {
          returnDocument: "after",
        },
      );

      if (!updated) {
        const exists = await CommentsCollection.exists({ _id: commentId });
        res.json({
          code: 1,
          codeText: exists
            ? "Have no authorization to edit this comment"
            : "Comment doesn't exist",
        });
        return;
      }

      res.json({
        code: 0,
        codeText: "Update comment successfully",
      });
    } catch (error) {
      res.json({
        code: 1,
        codeText: "Server error",
      });
    }
  },
  // GET /api/news/:newsId/comments
  async readComments(
    req: Request,
    res: Response<ApiResponse<CommentListData>>,
  ): Promise<void> {
    // 驗證參數
    const { newsId } = req.params;
    if (!newsId) {
      res.json({
        code: 1,
        codeText: "Missing newsId",
      });
      return;
    }

    const result = GetCommemtsSchema.safeParse(req.query);
    if (!result.success) {
      res.json({
        code: 1,
        codeText: result.error.issues[0]?.message || "Invalid params",
      });
      return;
    }

    const { limit, offset, sort, parentCommentId } = result.data;
    const sortOrder = sort === "oldest" ? 1 : -1;
    const condition = { newsId, parentCommentId: parentCommentId ?? null };
    const currentUserId = req?.user?.id ?? null;

    try {
      // 根據條件撈資料
      const [commentList, total] = await Promise.all([
        CommentsCollection.find(condition)
          .sort({ createdAt: parentCommentId ? 1 : sortOrder })
          .skip(offset)
          .limit(limit)
          .populate<{ userId: PopulatedUser }>("userId", "name pic") // 只拿用戶名字和頭像
          .populate<{ replyToUserId: PopulatdReplyUser }>( // 只拿回答用戶的名稱
            "replyToUserId",
            "name", // 要拿使用者的id嗎？
          )
          .lean<PopulatedComment[]>(),
        CommentsCollection.countDocuments(condition),
      ]);

      // 處理likes / dislikes，不直接回傳原始陣列
      const processedList: ProcessedComment[] = commentList.map((comment) => {
        const { likes, dislikes, ...rest } = comment;
        const likesArr = likes.map((id) => id.toString()),
          dislikesArr = dislikes.map((id) => id.toString());
        return {
          ...rest,
          likesCount: likesArr.length,
          dislikesCount: dislikesArr.length,
          userReaction: currentUserId
            ? likesArr.includes(currentUserId)
              ? 1
              : dislikesArr.includes(currentUserId)
                ? -1
                : 0
            : 0,
        };
      });

      res.json({
        code: 0,
        codeText: "OK",
        data: {
          commentList: processedList,
          total,
          hasMore: offset + commentList.length < total,
        },
      });
    } catch (error: any) {
      res.json({ code: 1, codeText: "Server error" });
    }
  },
  // DELETE /api/comments/:commentId
  async deleteComment(req: Request, res: Response<ApiResponse>): Promise<void> {
    const { commentId } = req.params;
    if (!commentId) {
      res.json({
        code: 1,
        codeText: "Missing commentId",
      });
      return;
    }

    try {
      // 找到該留言並刪除
      const deleted = await CommentsCollection.findOneAndDelete({
        _id: commentId,
        userId: req.user.id,
      });

      if (!deleted) {
        const exists = await CommentsCollection.exists({ _id: commentId });
        res.json({
          code: 1,
          codeText: exists
            ? "Have no authorization to edit this comment"
            : "Comment doesn't exist",
        });
        return;
      }

      if (deleted.parentCommentId) {
        // 若是刪除的是樓中樓回覆，則更新父留言的replyCount
        await CommentsCollection.findByIdAndUpdate(deleted.parentCommentId, {
          $inc: { replyCount: -1 },
        });
      } else {
        // 刪除的是主樓，樓中樓留言一併刪除（刪除所有 parentCommentId 等於當前這個 id 的樓中樓留言）
        await CommentsCollection.deleteMany({ parentCommentId: commentId });
      }

      res.json({
        code: 0,
        codeText: "Delete comment successfully",
      });
    } catch (error) {
      res.json({
        code: 1,
        codeText: "Server error",
      });
    }
  },
  // POST /api/comments/:commentId/reaction
  async handleReaction(
    req: Request,
    res: Response<ApiResponse<ReactionResult>>,
  ): Promise<void> {
    const result = HandleReactionSchema.safeParse({
      params: req.params,
      body: req.body,
    });

    if (!result.success) {
      res.json({
        code: 1,
        codeText: result.error.issues[0]?.message || "params format incorrect",
      });
      return;
    }

    const {
      params: { commentId },
      body: { type },
    } = result.data;

    try {
      // 找到留言
      const comment = await CommentsCollection.findById(commentId);
      if (!comment) {
        res.json({
          code: 1,
          codeText: "Comment user try to react doesn't exist",
        });
        return;
      }

      // 定義更新操作物件and型別
      let updateOperation: UpdateQuery<IComment> = {};
      const isLiked = comment.likes
        .map((id) => id.toString())
        .includes(req.user.id);
      const isDisLiked = comment.dislikes
        .map((id) => id.toString())
        .includes(req.user.id);

      if (type === 1) {
        updateOperation = isLiked
          ? { $pull: { likes: req.user.id } }
          : {
              $addToSet: { likes: req.user.id },
              $pull: { dislikes: req.user.id },
            };
      } else if (type === -1) {
        updateOperation = isDisLiked
          ? { $pull: { dislikes: req.user.id } }
          : {
              $addToSet: { dislikes: req.user.id },
              $pull: { likes: req.user.id },
            };
      } else {
        // 取消所有反應
        updateOperation = {
          $pull: { likes: req.user.id, dislikes: req.user.id },
        };
      }

      // 更新
      const updateComment = await CommentsCollection.findByIdAndUpdate(
        commentId,
        updateOperation,
        { returnDocument: "after" },
      ).lean<IComment>();

      if (!updateComment) {
        res.json({
          code: 1,
          codeText: "Update fail",
        });
        return;
      }

      const userId = req.user.id,
        likesArr = updateComment.likes.map((id) => id.toString()),
        dislikesArr = updateComment.dislikes.map((id) => id.toString());

      res.json({
        code: 0,
        codeText: "OK",
        data: {
          likesCount: likesArr.length,
          dislikesCount: dislikesArr.length,
          userReaction: likesArr.includes(userId)
            ? 1
            : dislikesArr.includes(userId)
              ? -1
              : 0,
        },
      });
    } catch (error) {
      res.json({
        code: 1,
        codeText: "Server error",
      });
    }
  },
};

import { type Request, type Response } from "express";
import { z } from "zod";
import type { INews, INewsDocument } from "@/models/News.js";
import type {
  ApiResponse,
  FavoriteListData,
  PopulatedFavorite,
} from "@/types/index.js";
import { PaginationWithSortSchema } from "@/schemas/pagination.schema.js";
import { Types } from "mongoose";

import FavoritesCollection from "@/models/Favorites.js";
import NewsCollection from "@/models/News.js";

const GetFavoriteSchema = PaginationWithSortSchema;

export const favoritesController = {
  // GET /api/user/favorites/:newsId
  async checkFavorite(
    req: Request,
    res: Response<ApiResponse<{ isFavorited: boolean }>>,
  ): Promise<void> {
    const { newsId } = req.params;

    if (!newsId) {
      res.json({
        code: 1,
        codeText: "Missing newsId",
      });
      return;
    }

    try {
      const record = await FavoritesCollection.findOne({
        userId: req.user.id,
        newsId,
      }).lean();

      const isFavorited = !!record;

      res.json({
        code: 0,
        codeText: "",
        data: {
          isFavorited,
        },
      });
    } catch (error) {
      res.json({
        code: 1,
        codeText: "Server Error",
        data: {
          isFavorited: false,
        },
      });
    }
  },
  // GET /api/user/favorites
  async getFavoritesList(
    req: Request,
    res: Response<ApiResponse<FavoriteListData>>,
  ): Promise<void> {
    // 1. 驗證query params
    const result = GetFavoriteSchema.safeParse(req.query);
    if (!result.success) {
      res.json({
        code: 1,
        codeText: result.error.issues[0]?.message || "params format incorrect",
      });
      return;
    }
    const { limit, offset, sort } = result.data;

    const sortOrder = sort === "oldest" ? 1 : -1;
    try {
      const [list, total] = await Promise.all([
        FavoritesCollection.find({ userId: req.user.id })
          .populate<{ newsId: INewsDocument }>({
            path: "newsId",
            select: "-body -__v",
          }) // 透過newsId撈出對應id的完整新聞內容，未執行populate：item.newsId是"...."（字串），執行populate後item.newsId等於{_id: "...", title: "今日新聞...", ...}（物件）
          .sort({ createdAt: sortOrder })
          .skip(offset)
          .limit(limit)
          .lean<PopulatedFavorite[]>(),
        FavoritesCollection.countDocuments({ userId: req.user.id }),
      ]);

      const favoriteList: Omit<
        INews,
        "externalId" | "author" | "url" | "createdAt" | "body"
      >[] = list
        .filter((item) => item.newsId) // 濾掉newsId為空的news，避免有新聞被刪除了但還留在收藏紀錄中
        .map((item) => {
          const news = item.newsId;
          return {
            _id: String(news._id),
            title: news.title,
            description: news.description,
            urlToImage: news.urlToImage,
            category: news.category,
            source: {
              id: news.source.id ?? "",
              name: news.source.name,
            },
            publishedAt: news.publishedAt,
          };
        });

      res.json({
        code: 0,
        codeText: "",
        data: {
          favoriteList,
          total,
          hasMore: offset + limit < total, // 前端用於判斷是否load more
        },
      });
    } catch (error) {
      res.json({ code: 1, codeText: "Server error" });
    }
  },
  // POST /api/user/favorites
  async addToFavorites(
    req: Request,
    res: Response<ApiResponse>,
  ): Promise<void> {
    // 驗證newsId參數
    const { newsId } = req.body as { newsId?: string };
    if (!newsId || !Types.ObjectId.isValid(newsId)) {
      res.json({ code: 1, codeText: "Invalid newsId param" });
      return;
    }

    try {
      // 確認新聞存在
      const news = await NewsCollection.exists({ _id: newsId });
      if (!news) {
        res.json({
          code: 1,
          codeText: "News not found",
        });
        return;
      }

      await FavoritesCollection.create({
        userId: req.user.id,
        newsId,
      });

      res.json({
        code: 0,
        codeText: "Added to favorites successfully",
      });
    } catch (error: any) {
      // code = 11000 = MongoDB duplicate key，代表已經收藏過
      if (error.code === 11000) {
        res.json({ code: 1, codeText: "Already in favorites" });
        return;
      }
      res.json({ code: 1, codeText: "Server error" });
    }
  },
  // DELETE /api/user/favorites/:newsId
  async removeFromFavorites(
    req: Request,
    res: Response<ApiResponse>,
  ): Promise<void> {
    //
    const { newsId } = req.params;
    if (!newsId) {
      res.json({ code: 1, codeText: "Missing newsId" });
      return;
    }

    try {
      const result = await FavoritesCollection.findOneAndDelete({
        userId: req.user.id,
        newsId,
      });

      if (!result) {
        res.json({
          code: 1,
          codeText: "Favorite not found",
        });
        return;
      }

      res.json({ code: 0, codeText: "Removed from favorites successfully" });
    } catch (error) {
      res.json({ code: 1, codeText: "Server error" });
    }
  },
};

/* 獲取登錄者收藏列表 GET */
/* const MAX_LIMIT: number = 5;
const GetFavoriteSchema = z.object({
  limit: z
    .string()
    .optional()
    .default(`${MAX_LIMIT}`)
    .transform((val) => {
      const num = Number(val);
      if (isNaN(num)) return MAX_LIMIT;
      return num > MAX_LIMIT ? MAX_LIMIT : num;
    }),
  offset: z
    .string()
    .optional()
    .default("0")
    .transform((val) => {
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    }),
}); */

/* export const getFavoritesList = async (req: Request, res: Response) => {
  try {
    if (!req.user)
      return res.status(401).json({ code: 1, message: "Unauthorized" });

    const { limit, offset } = GetFavoriteSchema.parse(req.query);
    const userId = req.user.id;

    const [totalAmount, list] = await Promise.all([
      FavoritesCollection.countDocuments({ userId }),
      FavoritesCollection.find({ userId })
        .populate("newsId") // 透過newsId撈出對應id的完整新聞內容
        .skip(offset) // 跳過前幾個
        .limit(limit) // 只拿幾個
        .lean(), // 轉成純JS物件（預設回傳Document 物件 => 帶有 .save()、.update() 等方法）
    ]);

    const data = list.map((item) => {
      const news = item.newsId as unknown as INews;
      return {
        id: item._id, // 該筆收藏id
        userId: item.userId,
        news: {
          id: news?._id, // 該筆新聞id
          title: news?.title,
          urlToImage: news?.urlToImage,
        },
      };
    });

    res.json({
      code: 0,
      codeText: "OK",
      data: data,
      totalAmount,
      hasMore: totalAmount > offset + data.length,
    });
  } catch (error: any) {
    res.json({
      code: 1,
      codeText: error.message,
      data: null,
    });
  }
}; */

/* 加入收藏 POST */
/* const AddFavoriteSchema = z.object({
  newsId: z.string().min(1, "newsId is required"),
});
export const addToFavorites = async (req: Request, res: Response) => {
  try {
    if (!req.user)
      return res.status(401).json({ code: 1, message: "Unauthorized" });

    const { newsId } = AddFavoriteSchema.parse(req.body);

    // 檢查是否收藏過
    const existingRecord = await FavoritesCollection.findOne({
      userId: req.user.id,
      newsId: newsId,
    });
    if (existingRecord) {
      return res.json({
        code: 0,
        codeText: "news already exists in collections",
      });
    }

    // 建立收藏紀錄
    await FavoritesCollection.create({
      userId: req.user.id,
      newsId: newsId,
    });

    res.json({
      code: 0,
      codeText: "OK",
    });
  } catch (error: any) {
    handleError(res, error);
  }
}; */

/* 移除收藏 DELETE */
/* const RemoveFavoriteSchema = z.object({
  id: z.string().min(1, "Favorite record ID is required"),
});

export const removeFromFavorites = async (req: Request, res: Response) => {
  try {
    if (!req.user)
      return res.status(401).json({ code: 1, message: "Unauthorized" });

    const { id } = RemoveFavoriteSchema.parse(req.params);

    const result = await FavoritesCollection.findOneAndDelete({
      _id: id,
      userId: req.user.id,
    });

    if (!result) {
      return res.json({
        code: 1,
        codeText: "移除失敗：找不到該收藏紀錄",
      });
    }

    res.json({
      code: 0,
      codeText: "OK",
    });
  } catch (error: any) {
    handleError(res, error);
  }
};

const handleError = (res: Response, error: any) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      code: 1,
      codeText: "Validation Error",
      errors: error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      ),
    });
  }
  res.json({
    code: 1,
    codeText: error.message,
  });
}; */

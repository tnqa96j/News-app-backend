import { type Request, type Response } from "express";
import NewsCollection, { type INews } from "@/models/News.js";
import { z } from "zod";
import type { ApiResponse, NewsListData } from "@/types/index.js";
import { PaginationWithSortSchema } from "@/schemas/pagination.schema.js";

const GetNewsSchema = PaginationWithSortSchema.extend({
  category: z.string().optional(),
  q: z.string().optional(),
  sourceId: z.string().optional(),
  publishedAfter: z.string().optional(),
  publishedBefore: z.string().optional(),
});

export const newsController = {
  async getNews(
    req: Request,
    res: Response<ApiResponse<NewsListData>>,
  ): Promise<void> {
    // 1. 驗證 query params
    const result = GetNewsSchema.safeParse(req.query);
    if (!result.success) {
      res.json({
        code: 1,
        codeText: result.error.issues[0]?.message || "params format incorrect",
      });
      return;
    }

    const {
      category,
      q,
      sourceId,
      publishedAfter,
      publishedBefore,
      limit,
      offset,
      sort,
    } = result.data;

    try {
      // 2. 組合條件
      const filter: Record<string, unknown> = {};
      if (category && category != "all") filter.category = category; // 有傳category才加這個條件
      if (q) {
        // 有傳q才加這個條件(需要text index)
        filter.$or = [
          {
            title: {
              $regex: q,
              $options: "i",
            },
          },
          {
            description: {
              $regex: q,
              $options: "i", // i = case insensitive
            },
          },
        ];
      }
      if (sourceId) filter["source.id"] = sourceId; // 有傳sourceId再加上
      if (publishedAfter || publishedBefore) {
        filter.publishedAt = {
          ...(publishedAfter && { $gte: new Date(publishedAfter) }),
          ...(publishedBefore && { $lt: new Date(publishedBefore) }),
        };
      }

      const sortOrder = sort === "oldest" ? 1 : -1;

      // 3. 根據條件撈資料
      const [stories, total] = await Promise.all([
        NewsCollection.find(filter)
          .sort({ publishedAt: sortOrder })
          .skip(offset)
          .limit(limit)
          .select("-body") // 列表頁不回傳完整內容
          .lean<INews[]>(), // 將Mongoose Document 物件轉換為純JS物件
        NewsCollection.countDocuments(filter),
      ]);
      // 輪播圖用，一定要有urlToImage
      const topStories = stories.filter((item) => item.urlToImage).slice(0, 4);

      res.json({
        code: 0,
        codeText: "",
        data: {
          stories,
          topStories,
          total,
          hasMore: offset + limit < total, // 前端用於判斷是否load more
        },
      });
    } catch (error) {
      res.json({
        code: 1,
        codeText: "Server error",
      });
    }
  },
  async getNewsDetailById(
    req: Request,
    res: Response<ApiResponse<INews>>,
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
      const news = await NewsCollection.findById(newsId).lean<INews>();

      if (!news) {
        res.json({
          code: 1,
          codeText: "Unable to find news articles corresponding to this newsId",
        });
        return;
      }
      res.json({
        code: 0,
        codeText: "",
        data: news,
      });
    } catch (err: any) {
      res.json({ code: 1, codeText: "Invalid newsId" });
      console.log(err.message);
    }
  },
};

/*time: z // 傳來字串為yyyyMMDD 8位字串
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      return /^\d{8}$/.test(val); // 轉換為8位數字
    }, "The time parameter must be in the format yyyyMMDD"),*/

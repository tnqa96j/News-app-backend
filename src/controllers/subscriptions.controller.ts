import type { Request, Response } from "express";
import SubscriptionCollection from "@/models/Subscription.js";
import type { ApiResponse } from "@/types/index.js";
import type { SubscriptionItem, SubscriptionListData } from "@/types/index.js";
import { PaginationWithSortSchema } from "@/schemas/pagination.schema.js";

const GetSubscriptionSchema = PaginationWithSortSchema;

export const subscriptionsController = {
  // GET /api/user/subscription/:sourceId
  async checkSubscribe(
    req: Request,
    res: Response<ApiResponse<{ subscribed: boolean }>>,
  ): Promise<void> {
    const { sourceId } = req.params;

    if (!sourceId) {
      res.json({
        code: 1,
        codeText: "Missing sourceId",
      });
      return;
    }

    try {
      const record = await SubscriptionCollection.findOne({
        userId: req.user.id,
        sourceId,
      }).lean();

      const subscribed = !!record;

      res.json({
        code: 0,
        codeText: "",
        data: {
          subscribed,
        },
      });
    } catch (error) {
      res.json({
        code: 1,
        codeText: "Server Error",
        data: {
          subscribed: false,
        },
      });
    }
  },
  // GET /api/user/subscription
  async getSubscription(
    req: Request,
    res: Response<ApiResponse<SubscriptionListData>>,
  ): Promise<void> {
    // 1. 驗證query params
    const result = GetSubscriptionSchema.safeParse(req.query);
    if (!result.success) {
      res.json({
        code: 1,
        codeText: result.error.issues[0]?.message || "params format incorrect",
      });
      return;
    }
    const { limit, offset, sort } = result.data; // sort：一律由新到舊
    const SortOrder = sort === "oldest" ? 1 : -1;

    try {
      const [list, total] = await Promise.all([
        SubscriptionCollection.find({ userId: req.user.id })
          .sort({ createAt: SortOrder })
          .skip(offset)
          .limit(limit)
          .lean(),
        SubscriptionCollection.countDocuments({ userId: req.user.id }),
      ]);

      const subList: SubscriptionItem[] = list.map((item) => ({
        subscriptionId: String(item._id),
        sourceId: item.sourceId,
        sourceName: item.sourceName,
      }));

      res.json({
        code: 0,
        codeText: "",
        data: {
          subList,
          total,
          hasMore: offset + limit < total,
        },
      });
    } catch (error) {
      res.json({ code: 1, codeText: "Server error" });
    }
  },
  // POST /api/user/subscription
  async addToSubscription(
    req: Request,
    res: Response<ApiResponse>,
  ): Promise<void> {
    // 驗證
    const { sourceId, sourceName } = req.body as {
      sourceId?: string;
      sourceName?: string;
    };
    
    if (!sourceId || !sourceName) {
      res.json({ code: 1, codeText: "Missing sourceId or sourceName" });
      return;
    }

    try {
      await SubscriptionCollection.create({
        userId: req.user.id,
        sourceId,
        sourceName,
      });

      res.json({
        code: 0,
        codeText: "Subscribed successfully",
      });
    } catch (error: any) {
      if (error.code === 11000) {
        res.json({ code: 1, codeText: "Already subscribed" });
        return;
      }
      res.json({ code: 1, codeText: "Server error" });
    }
  },
  // DELETE /api/user/subscription/:sourceId
  async removeFromSubscription(
    req: Request,
    res: Response<ApiResponse>,
  ): Promise<void> {
    const { sourceId } = req.params;
    if (!sourceId) {
      res.json({ code: 1, codeText: "Missing sourceId" });
      return;
    }

    try {
      const result = await SubscriptionCollection.findOneAndDelete({
        userId: req.user.id,
        sourceId
      });

      if (!result) {
        res.json({
          code: 1,
          codeText: "sourceId not found",
        });
        return;
      }

      res.json({ code: 0, codeText: "Unsubscribed successfully" });
    } catch (error) {
      res.json({ code: 1, codeText: "Server error" });
    }
  },
};

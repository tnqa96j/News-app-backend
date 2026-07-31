import cron from "node-cron";
import { guardianService } from "./guardianService.js";
import { freeNewsService } from "./freeNewsApiIOService.js";
import NewsCollection from "@/models/News.js";

const SECTIONS = [
  "world",
  "technology",
  "business",
  "science",
  "sport",
  "culture",
];

const SECTIONS_MAP = {
  world: "world",
  technology: "technology",
  business: "business",
  science: "science",
  sport: "sports",
  culture: "entertainment",
} as const;

const isValidImageUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch (error) {
    return false;
  }
};

const normalizeSourceId = (publisher: string): string => {
  return publisher
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // 空格換成連字號
    .replace(/[^a-z0-9-]/g, "") // 移除特殊字元
    .replace(/-+/g, "-"); // 多個連字號合併
};

const fetchGuardianNews = async () => {
  await Promise.all(
    SECTIONS.map(async (section) => {
      try {
        const response = await guardianService.fetchArticles({
          section,
          pageSize: 10,
        });

        await Promise.all(
          response.results.map(async (article) => {
            await NewsCollection.findOneAndUpdate(
              { externalId: article.id },
              {
                $set: {
                  source: {
                    id: `the-guardian`,
                    name: "The Guardian",
                  },
                  title: article.webTitle,
                  author: article.fields.byline ?? "Unknown",
                  description: article.fields.trailText ?? "",
                  url: article.webUrl,
                  urlToImage: article.fields.thumbnail ?? "",
                  publishedAt: new Date(article.webPublicationDate),
                  body: article.fields.body ?? "",
                  category: section,
                },
                $setOnInsert: {
                  externalId: article.id,
                },
              },
              {
                upsert: true,
                returnDocument: "after",
              },
            );
          }),
        );
        console.log(`[${section}] The Guardian Api抓取完成`);
      } catch (error: any) {
        if (error?.code === 11000) return; // url重複，跳過
        console.error(`[${section}] The Guardian Api 抓取失敗:`, error);
      }
    }),
  );
};

const fetchFreeNews = async () => {
  for (const [section, topic] of Object.entries(SECTIONS_MAP)) {
    try {
      // 1. 取得文章列表
      const articles = await freeNewsService.fetchArticleList({
        topic,
        pageSize: 10,
      });

      if (!articles || articles.length === 0) {
        console.log(`[${section}] 無新文章`);
        continue;
      }

      const filteredArticles = articles.filter(
        (article) => article.publisher !== "The Guardian",
      );

      // 2. 取得文章完整內容
      // 用 for...of 加延遲，避免觸發 rate limit(2 req/sec)
      for (const article of filteredArticles) {
        const detail = await freeNewsService.fetchArticleDetail(article.uuid);
        if (!detail || !isValidImageUrl(detail.thumbnail)) continue;

        // 作者名：authors 陣列是 ["名字", "連結", "名字2", "連結2"] 交錯
        // 只取奇數索引的名字
        const authorName =
          detail.authors.filter((_, i) => i % 2 === 0).join(", ") || "unknown";

        await NewsCollection.findOneAndUpdate(
          { externalId: detail.uuid },
          {
            $set: {
              source: {
                id: normalizeSourceId(detail.publisher),
                name: detail.publisher,
              },
              title: detail.title,
              author: authorName,
              description: detail.incipit ?? "",
              url: detail.original_url,
              urlToImage: detail.thumbnail ?? "",
              publishedAt: new Date(detail.published_at),
              body: detail.body ?? "",
              category: section,
            },
            $setOnInsert: {
              externalId: detail.uuid,
            },
          },
          { upsert: true, returnDocument: "after" },
        );
        // 每篇之間等 1000ms，確保不超過 2 req/sec
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      console.log(`[${section}] FreeNewsApi 抓取完成`);
    } catch (error) {
      console.error(`[${section}] FreeNewsApi 抓取失敗:`, error);
    }
  }
};

const deleteOldNews = async () => {
  const result = await NewsCollection.deleteMany({
    publishedAt: {
      $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`已刪除 ${result.deletedCount} 篇舊新聞`);
};

export const fetchNewsCron = () => {
  cron.schedule(
    "0 * * * *",
    async () => {
      const now = new Date().toLocaleTimeString();
      console.log(`[${now}] 開始抓取新聞`);
      try {
        // 刪除30天前的舊新聞
        await deleteOldNews();
        await Promise.all([fetchGuardianNews(), fetchFreeNews()]);
        console.log(`[${now}] 抓取完畢`);
      } catch (error) {
        console.error(`[${now}] 抓取失敗:`, error);
      }
    },
    { timezone: "Asia/Taipei" },
  );
};

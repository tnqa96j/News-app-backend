import axios from "axios";

const BASE_URL = "https://api.freenewsapi.io/v1";

// /v1/news 回傳的單筆結構
interface FreeNewsListItem {
  uuid: string;
  title: string;
  published_at: string;
  publisher: string;
}

// /v1/details 回傳的完整結構
interface FreeNewsDetail {
  authors: string[];
  body: string;
  countries: string[];
  incipit: string;
  languages: string[];
  original_url: string;
  published_at: string;
  publisher: string;
  thumbnail: string;
  title: string;
  topics: string[];
  uuid: string;
}

interface FreeNewsListResponse {
  data: FreeNewsListItem[];
  meta: {
    return: number;
    has_more: boolean;
    next_offset: number;
  };
}

interface FreeNewsDetailResponse {
  data: FreeNewsDetail;
}

export const freeNewsService = {
  // 1. 取得文章列表
  async fetchArticleList(params: {
    topic: string;
    language?: string;
    pageSize?: number;
  }): Promise<FreeNewsListItem[]> {
    const { data } = await axios.get<FreeNewsListResponse>(`${BASE_URL}/news`, {
      headers: { "x-api-key": process.env.FREENEWSAPI_IO_KEY },
      params: {
        topic: params.topic,
        language: params.language ?? "en",
        page_size: params.pageSize ?? 10,
        order_by: "recent",
      },
    });
    return data.data;
  },
  // 2. 取得單篇完整文章
  async fetchArticleDetail(uuid: string): Promise<FreeNewsDetail | null> {
    try {
      const { data } = await axios.get<FreeNewsDetailResponse>(
        `${BASE_URL}/details`,
        {
          headers: { "x-api-key": process.env.FREENEWSAPI_IO_KEY },
          params: { uuid },
        },
      );
      return data.data;
    } catch (error) {
      return null;
    }
  },
};

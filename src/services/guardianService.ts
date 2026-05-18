import axios from "axios";

const BASE_URL = "https://content.guardianapis.com";

interface GuardianArticle {
  id: string;
  type: string;
  sectionId: string;
  sectionName: string;
  webPublicationDate: string;
  webTitle: string;
  webUrl: string;
  fields: {
    thumbnail?: string;
    byline?: string;
    trailText?: string;
    bodyText?: string;
    body?: string;
  };
}

interface GuardianResponse {
  response: {
    status: string;
    total: number;
    pageSize: number;
    currentPage: number;
    pages: number;
    results: GuardianArticle[];
  };
}

export const guardianService = {
  async fetchArticles(params: {
    section?: string;
    q?: string;
    page?: number;
    pageSize?: number;
    fromDate?: string;
    toDate?: string;
  }) {
    const { data } = await axios.get<GuardianResponse>(`${BASE_URL}/search`, {
      params: {
        "api-key": process.env.GUARDIAN_API_KEY,
        "show-fields": "thumbnail,byline,trailText,body",
        "page-size": params.pageSize ?? 10,
        page: params.page ?? 1,
        "order-by": "newest",
        ...(params.section && { section: params.section }),
        ...(params.q && { q: params.q }),
        ...(params.fromDate && { "from-date": params.fromDate }),
        ...(params.toDate && { "to-date": params.toDate }),
      },
    });

    return data.response;
  },
  async fetchArticleById(articleId: string) {
    const { data } = await axios.get<{
      response: {
        status: string;
        content: GuardianArticle;
      };
    }>(`${BASE_URL}/${articleId}`, {
      params: {
        "api-key": process.env.GUARDIAN_API_KEY,
        "show-fields": "thumbnail,byline,trailText,body",
      },
    });
    return data.response.content;
  },
};

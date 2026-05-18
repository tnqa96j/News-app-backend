import type { JwtPayload } from "jsonwebtoken";
import type { INews, INewsDocument } from "@/models/News.js";
import type { IComment } from "@/models/Comment.js";
import type { Types } from "mongoose";
// JWT payload type
export interface JwtPayloadCustom extends JwtPayload {
  id: string;
  email?: string;
  phone?: string;
}

// API response format
export interface ApiResponse<T = null> {
  code: 0 | 1;
  codeText: string;
  data?: T;
}

export interface ListData {
  total: number;
  hasMore: boolean;
}

// response News data format
export interface NewsListData extends ListData {
  stories: INews[]; // for newsItem data
  topStories: INews[]; // for banner data
}

// 在getFavorites時定義populate後的型別
export interface PopulatedFavorite {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  newsId: INewsDocument; // populate 後是物件而不是 ObjectId
  createdAt: Date;
}

// response Favorites list data format
export interface FavoriteListData extends ListData {
  favoriteList: Omit<
    INews,
    "externalId" | "author" | "url" | "createdAt" | "body"
  >[];
}

// response Subscription list data format
export interface SubscriptionListData extends ListData {
  subList: SubscriptionItem[];
}

export interface SubscriptionItem {
  subscriptionId: string;
  sourceId: string;
  sourceName: string;
}

/* Comment */
export interface PopulatedUser {
  _id: string;
  name: string;
  pic: string;
}

export interface PopulatdReplyUser {
  _id: string;
  name: string;
}

export interface PopulatedComment extends Omit<
  IComment,
  "userId" | "replyToUserId"
> {
  _id: string;
  userId: PopulatedUser;
  replyToUserId: PopulatdReplyUser | null;
}

export interface ProcessedComment extends Omit<
  PopulatedComment,
  "likes" | "dislikes"
> {
  likesCount: number;
  dislikesCount: number;
  userReaction: 1 | -1 | 0;
}

// response comment list data format
export interface CommentListData extends ListData {
  commentList: ProcessedComment[];
}

export interface ReactionResult {
  likesCount: number;
  dislikesCount: number;
  userReaction: 1 | -1 | 0;
}

import { Schema, Document, model, Types } from "mongoose";

export interface IFavorites {
  userId: Types.ObjectId;
  newsId: Types.ObjectId;
  createdAt: Date;
}

export interface IFavoritesDocument extends IFavorites, Document {}

const favoritesSchema = new Schema<IFavoritesDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    newsId: {
      type: Schema.Types.ObjectId,
      ref: "News",
      required: true,
    },
  },
  { timestamps: true },
);
// 唯一複合索引：確保同一個人不會收藏同一篇新聞兩次
favoritesSchema.index(
  {
    userId: 1,
    newsId: 1,
  },
  {
    unique: true,
  },
);

favoritesSchema.index({ newsId: 1 });

export default model<IFavoritesDocument>("Collections", favoritesSchema);

import { Schema, Document, model } from "mongoose";

export interface INews {
  externalId: string;
  source: {
    id: string | null;
    name: string;
  };
  title: string;
  author: string;
  description: string;
  url: string;
  urlToImage: string;
  publishedAt: Date;
  // content: string;
  createdAt: Date;
  body: string;
  category: string;
}

export interface INewsDocument extends INews, Document {}

// 定義schema(規格)
const newsSchema = new Schema<INewsDocument>(
  {
    externalId: {
      type: String,
      unique: true,
    },
    source: {
      id: { type: String, default: null },
      name: { type: String, required: true },
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    author: { type: String, default: "Unknown" },
    description: String,
    url: { type: String, unique: true },
    urlToImage: String,
    publishedAt: { type: Date },
    // content: String,
    createdAt: { type: Date, default: Date.now },
    body: String,
    category: { type: String, default: "general" },
  },
  { timestamps: true },
);

// 建立索引，加快查詢速度
newsSchema.index({ publishedAt: -1 });
newsSchema.index({ category: 1, publishedAt: -1 });
newsSchema.index({ title: "text", description: "text" }); // 全文搜尋索引

export default model<INewsDocument>("News", newsSchema);

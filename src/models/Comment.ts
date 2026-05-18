import { Schema, Document, model, Types } from "mongoose";

export interface IComment {
  userId: Types.ObjectId;
  newsId: Types.ObjectId;
  content: string;
  parentCommentId: Types.ObjectId | null;
  replyToUserId: Types.ObjectId | null;
  replyCount: number;
  likes: Types.ObjectId[];
  dislikes: Types.ObjectId[];
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICommentDocument extends IComment, Document {}

const CommentSchema: Schema = new Schema(
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
    content: {
      type: String,
      required: true,
      trim: true,
    },
    parentCommentId: {
      type: Schema.Types.ObjectId,
      ref: "Comments",
      default: null,
    },
    replyToUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    replyCount: {
      type: Number,
      default: 0,
    },
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    dislikes: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // 自動生成createdAt 和 updatedAt
  },
);

CommentSchema.index({ newsId: 1, createdAt: -1 });
CommentSchema.index({ parentCommentId: 1, createdAt: 1 }); // 樓中樓索引

export default model<ICommentDocument>("Comment", CommentSchema);

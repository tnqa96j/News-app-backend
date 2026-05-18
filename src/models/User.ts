import { Schema, Document, Types, model } from "mongoose";

export interface IUser {
  phone?: string;
  email?: string;
  googleId?: string;
  name: string;
  pic: string;
}

export interface IUserDocument extends IUser, Document {}

const UserSchema = new Schema(
  {
    phone: {
      type: String,
      unique: true, // 保證手機號碼不重複
      sparse: true, // 讓 unique 索引允許多個 null 值，因為手機登入的使用者不會有 email
      trim: true, // 自動修剪前後空格
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    name: {
      type: String,
      required: true,
    },
    pic: {
      type: String,
      default: "",
    },
  },
  {
    // 啟動自動戳時間，自動建立createdAt 和 updatedAt 兩個欄位
    timestamps: true,
  },
);

export default model<IUserDocument>("User", UserSchema);

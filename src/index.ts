import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import connectDB from "@/config/db.js";

import authRoutes from "@/routes/auth.routes.js";
import commentRoutes from "@/routes/comment.routes.js";
import newsRoutes from "@/routes/news.routes.js";
import userRoutes from "@/routes/user.routes.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 7100;

// 連線資料庫
connectDB();

// middleware
app.use(
  cors({
    origin: [
      `http://localhost:${PORT}`, // 本機開發
      "https://news-app-omega-five.vercel.app", // 上線網址
    ],
    credentials: true,
  }),
); // 允許跨域請求
app.use(express.json({ limit: "10kb" })); // 解析JSON格式的請求主體(req.body)
app.use(express.urlencoded({ extended: true, limit: "10kb" })); // 解析URL編碼格式的請求體，限制請求體大小，超過直接拒絕

// 導入路由(prefix /api/comments)
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/comments", commentRoutes);

app.get("/", (req, res) => {
  res.send("API is running...");
});

// health check endpoint
app.get("/health", (req, res) => {
  try {
    res.status(200).json({ status: "ok" });
    console.log("Health check 成功");
  } catch (error) {
    console.log("Health check 失敗", error);
    res.status(500).json({ status: "error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

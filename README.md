# News-app-backend
## 專案介紹
News-app 的後端 API Server，負責處理使用者驗證、新聞資料聚合與儲存、收藏／訂閱／留言等個人化功能
網站Demo：https://news-app-omega-five.vercel.app/#/
前端Repo：https://github.com/tnqa96j/News-app
後端Repo：https://github.com/tnqa96j/News-app-backend

## 使用技術
* 語言：TypeScript
* 環境：NodeJS
* 後端框架：Express
* 身分驗證：JWT ＆ Google OAuth
* 任務排程：node-cron
* 資料驗證：Zod
* Database：MongoDB Atlas（Mongoose）
* Image Server：Cloudinary（搭配 Multer 處理檔案上傳）
* Email Server：Brevo
* 部署平台：Render

## API
使用RESTful API設計
| Method | Route | 說明 | 需驗證JWT |
|---|---|---|---|
| POST | `/api/auth/code/email` | 發送 Email OTP | ✗ |
| POST | `/api/auth/code/phone` | 發送手機 OTP | ✗ |
| POST | `/api/auth/login/email` | Email OTP 登入 | ✗ |
| POST | `/api/auth/login/phone` | 手機 OTP 登入 | ✗ |
| POST | `/api/auth/login/google` | Google 登入 | ✗ |
| GET | `/api/news` | 取得新聞列表（分類／搜尋／排序／分頁） | ✗ |
| GET | `/api/news/:newsId` | 取得單篇新聞內容 | ✗ |
| GET | `/api/news/:newsId/comments` | 取得該新聞留言 | 選填 |
| POST | `/api/news/:newsId/comments` | 新增留言 | ✓ |
| PATCH | `/api/comments/:commentId` | 編輯留言 | ✓ |
| DELETE | `/api/comments/:commentId` | 刪除留言 | ✓ |
| POST | `/api/comments/:commentId/reaction` | 留言按讚／倒讚 | ✓ |
| GET/PATCH | `/api/user/info` | 取得／修改個人資訊 | ✓ |
| POST | `/api/user/avatar` | 上傳大頭貼 | ✓ |
| GET/POST/DELETE | `/api/user/favorites` | 收藏新聞（含查詢是否已收藏） | ✓ |
| GET/POST/DELETE | `/api/user/subscriptions` | 訂閱新聞來源（含查詢是否已訂閱） | ✓ |
| GET | `/health` | 健康檢查 endpoint | ✗ |

## 技術總結
1. 登入 ＆ OTP ＆ JWT
* 三種登入方式：
  * Email OTP：串接`@getbrevo/brevo`服務，實作藉由Email寄送Otp的功能
  * 手機 OTP：僅模擬，手機號碼會用 `libphonenumber-js` 驗證格式並正規化成 E.164 格式
  * Google OAuth2.0：串接`google-auth-library`服務，實作Google第三方登入功能
    * 如果使用者之前是用 Email OTP 進行註冊，之後改用同一個 email的 Google 帳號進行登入，後端會偵測到 email 相同，直接把 googleId 綁定到既有帳號上，而不會產生兩個重複的使用者  
* OTP 機制設計
  * OTP資訊（account、code、過期時間、上次發送時間）用`Map`暫存在記憶體中，並設置：
    * 同一組帳號 60 秒內不能重複要求發送驗證碼，避免濫發
    * 驗證碼 5 分鐘後自動失效，且驗證成功後立刻刪除，防止重複使用
  * 待改進的部分：目前OTP是暫存在記憶體裡，電腦關機或伺服器重啟時資料會消失，可以改用 Redis儲存
* JWT驗證機制
  * 三種登入方式登入成功後都會簽發token回傳給前端，而前端發送攜帶token的請求時，可以藉由Auth middleware（JWT驗證）解析出其中的使用者資訊，確認有沒有權限進行這個操作（有些操作需要登入之後才能進行）
2. 聚合多個新聞API：排程、去重、rate limit 控制
* 主要從以下兩支API抓取資料：
  * The Guardian API（單一新聞來源、新聞內容完整）
  * FreeNewsAPI.io（多新聞來源、新聞內容可能有缺失）
  * 用`node-cron`每小時分別向兩支API請求六個分類的新聞，進行處理後再寫入DB：
    * 統一正規化成同一個schema，寫入DB時用 `findOneAndUpdate` 搭配 `upsert: true`，以 `externalId` 判斷新聞是否已存在，避免重複寫入同一篇文章
    * FreeNewsAPI 有 2 requests/秒的限流，抓取文章詳情時用 `for...of` 搭配 `setTimeout` 手動控制發送間隔，避免觸發 rate limit
4. 其他：
  * 在各個controller中使用Zod進行參數＆請求主體的資料型別驗證
  * 按需求在Mongoose schema設置複合唯一索引避免同一人重複進行某個操作
  * `$addToSet` ＋ `$pull` 的組合，確保同一使用者不會同時出現在 `likes` 與 `dislikes` 兩個陣列裡：按讚時若原本按過倒讚，會同時把它從 dislikes 移除；再次點擊同一個按鈕則是取消該反應。這個互斥邏輯前端也有對應搭配

import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "NewsApp_User_Avatar", // 雲端資料夾名稱
    allowed_formats: ["jpg", "jpeg", "png"], // 限制格式
    transformation: [{ width: 500, height: 500, crop: "limit" }], // 上傳時自動縮放
  } as object,
});

const AVATAR_SIZE_LIMIT = 2 * 1024 * 1024;

export const uploader = multer({
  storage,
  limits: { fieldSize: AVATAR_SIZE_LIMIT }, // 上限5mb
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only jpg, jpeg, png are allowed"));
    }
  },
});

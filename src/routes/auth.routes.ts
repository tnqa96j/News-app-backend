import { Router } from "express";
import { authController } from '@/controllers/auth.controller.js';
const router = Router();

// 發送驗證碼
router.post("/code/email", authController.sendEmailOtp); 
router.post("/code/phone", authController.sendPhoneOtp); 
// 登入
router.post("/login/email", authController.emailLogin); 
router.post("/login/phone", authController.phoneLogin); 
router.post("/login/google", authController.googleLogin); 


export default router;

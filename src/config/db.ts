/* 資料庫連線設置 */
import mongoose from "mongoose";
import dotenv from 'dotenv';
import { fetchNewsCron } from '@/services/fetchNewsCron.js';

dotenv.config();

const connectDB = async() => {
    try {
        const MONGO_URI = process.env.MONGO_URI;
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB Connected...');
        fetchNewsCron();
    } catch (error) {
        console.log('Database connection error:', error);
        process.exit(1); // 連線失敗，關閉程式
    }
}

export default connectDB;
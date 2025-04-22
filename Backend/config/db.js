import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { ENV_VARS } from './config.js';

 dotenv.config();

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(ENV_VARS.MONGO_URI);
        console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host}`);
    } catch (error) {
        console.log(`error connecting to the database: ${error.message}`)
        process.exit(1);
    }
};

export default connectDB;
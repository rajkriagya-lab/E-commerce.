import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import http from "http";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.Routes.js";
import productRoutes from "./routes/product.Routes.js";
import userRoutes from "./routes/user.routes.js";
import connectCloudinary from "./config/cloudinary.js";

dotenv.config();
connectCloudinary();

// APP

const app =express();
const httpServer = http.createServer(app);

// MIDDLEWARE

app.use(
    cors({
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        credentials: true,
    })
);

app.use(helmet());

app.use(express.json({limit: "1mb"}));

app.use(express.urlencoded({extended: true, limit :"1mb"}));

app.use(cookieParser());

// API ENDPOINT
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes)

// HEALTH CHECK
app.get("/", (req,res) => {
    res.status(200).json({
        success: true,
        message:"E-commers API is running",
    });
});

// SERVER

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, ()=>{
    console.log("E-commers BACKEND STARTED")
});
import { prisma } from "../db.js"
import bcrypt from "bcryptjs";
import generateToken from "../utils/generateToken.js";

export const registerUser = async (req, res) => {
    try {
        const {
            name,
            email,
            password
        } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fildes are required",
            });
        }

        const existingUser = await prisma.user.findUnique({
            where: {
                email,
            },
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User already exists with this email",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: "CUSTOMER",
            },
        });

        const token = generateToken(user.id);

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.status(201).json({
            success: true,
            message: "Account created successfully",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                avatar: user.avatar,
                createdAt: user.createdAt,
                role: user.role,
            },
        });
    } catch (error) {
        console.log("error", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const loginUser = async (req, res) => {
    try {
        const {
            email,
            password
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        const user = await prisma.user.findUnique({
            where: {
                email,
            },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User does not exist",
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
        }

        const token = generateToken(user.id);

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({
            success: true,
            message: "Logged in successfully",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                avatar: user.avatar,
                createdAt: user.createdAt,
                role: user.role,
            },
        });
    } catch (error) {
        console.log("error", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const logoutUser = async(req,res) => {
    try {
        res.cookie("token", "", {
            httpOnly: true,
            expires: new Date(0),
        });

        return res.status(200).json({
            success: true,
            message:"Logged out successfully",
        });
    } catch (error) {
        console.log("error",error)
        return res.status(500).json({
            success: false,
            message:error.message,
        });
    }
};

export const getMe = async (req,res) => {
    try {
        const{
            id,
            name,
            email,
            phone,
            role,
            avatar,
            createdAt
        } = req.user;

        return res.status(200).json({
            success: true,
            user:{
                 id,
            name,
            email,
            phone,
            role,
            avatar,
            createdAt
            },
        });
    } catch (error) {
        console.error("getMe error", error);
        return res.status(200).json({
            success: false,
            message:"Unable to retrive the current user.",
        });
    }
};
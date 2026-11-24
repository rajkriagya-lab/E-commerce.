import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
    getMe,
    loginUser,
    logoutUser,
    registerUser,
} from "../controller/auth.controller.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.get("/me", protect, getMe);

export default router;
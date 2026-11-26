import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
    getMyProfile,
    handleAvatarUploadError,
    updateMyProfile,
    uploadProfileAvatar,
} from "../controller/user.controller.js";

const router = express.Router();

router.get("/me", protect, getMyProfile);
router.patch("/me", protect, uploadProfileAvatar, handleAvatarUploadError, updateMyProfile);

export default router;
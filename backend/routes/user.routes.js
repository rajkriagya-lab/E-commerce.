import express from "express";
import { protect } from "../middleware/auth.middleware";
import { getMyProfile, handleAvatarUploadError, updateMyProfile, uploadProfileAvatar } from "../controller/user.controller";

const router = express.Router();

router.get("/me", protect, getMyProfile);
router.patch("/me", protect, uploadProfileAvatar, handleAvatarUploadError, updateMyProfile);

export default router;
import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { authorized } from "../middleware/authorized.middleware.js";
import {
    createProduct,
    deleteProduct,
    getProductById,
    getProducts,
    updateProduct,
} from "../controller/product.controller.js";

const router = express.Router();

router.get("/", getProducts);
router.get("/:id", getProductById);
router.post("/", protect, authorized("VENDOR", "ADMIN"), createProduct);
router.patch("/:id", protect, authorized("VENDOR", "ADMIN"), updateProduct);
router.delete("/:id", protect, authorized("VENDOR", "ADMIN"), deleteProduct);

export default router;

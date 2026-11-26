import prisma from "../db.js";

const productRelations = {
    category: true,
    seller: {
        select: {
            id: true,
            storeName: true,
            storeSlug: true,
        },
    },
    image: {
        orderBy: {
            position: "asc",
        },
    },
    variants: true,
};

export const getProducts = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 12,
            category,
            search,
            minPrice,
            maxPrice,
            sort = "newest",
            brand,
        } = req.query;

        const pageNumber = Math.max(1, Number(page) || 1);
        const limitNumber = Math.min(
            100,
            Math.max(1, Number(limit) || 12)
        );

        const skip = (pageNumber - 1) * limitNumber;

        const where = {
            status: "APPROVED",
            isActive: true,
        };

        if (category) {
            where.category = {
                slug: category,
            };
        }

        if (search) {
            where.OR = [
                {
                    name: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
                {
                    description: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
            ];
        }

        if (minPrice !== undefined || maxPrice !== undefined) {
            const min = minPrice === undefined ? 0 : Number(minPrice);
            const max =
                maxPrice === undefined ? undefined : Number(maxPrice);

            if (
                !Number.isFinite(min) ||
                min < 0 ||
                (max !== undefined &&
                    (!Number.isFinite(max) || max < min))
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid price range",
                });
            }

            where.price = {
                gte: min,
                ...(max !== undefined ? { lte: max } : {}),
            };
        }

        if (brand) {
            where.brand = {
                equals: brand,
                mode: "insensitive",
            };
        }

        const sortOptions = {
            newest: { createdAt: "desc" },
            oldest: { createdAt: "asc" },
            priceLow: { price: "asc" },
            priceHigh: { price: "desc" },
            name: { name: "asc" },
        };

        const orderBy = sortOptions[sort] || sortOptions.newest;

        const [products, totalProducts] = await Promise.all([
            prisma.product.findMany({
                where,
                include: productRelations,
                orderBy,
                skip,
                take: limitNumber,
            }),

            prisma.product.count({where}),
        ]);

        return res.status(200).json({
            success: true,
            message:"Product fetched successfully",
            data:{
                products,
                pagination:{
                    page: pageNumber,
                limit: limitNumber,
                totalProducts,
                totalpages: Math.ceil(totalProducts/limitNumber),
                },
            },
        });
    } catch (error) {
        console.error("Product error", error);
        return res.status(500).json({
            success: false,
            message: "Unable to fetch products.",
        });
    }
};

export const getProductById = async (req, res) => {
    try {
        const product = await prisma.product.findFirst({
            where: {
                id: req.params.id,
                status: "APPROVED",
                isActive: true,
            },
            include: productRelations,
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Product fetched successfully.",
            data: product,
        });
    } catch (error) {
        console.error("Get product error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to fetch the product.",
        });
    }
};

const getValidPrice = (value) => {
    const price = Number(value);
    return Number.isFinite(price) && price >= 0 ? price : null;
};

const findCategory = async (categoryId, categorySlug) => {
    if (!categoryId && !categorySlug) return null;
    return prisma.category.findFirst({
        where: categoryId ? { id: categoryId } : { slug: categorySlug },
        select: { id: true },
    });
};

export const createProduct = async (req, res) => {
    try {
        const {
            name,
            description,
            brand,
            price,
            categoryId,
            categorySlug,
            isActive = true,
            status,
            images = [],
            variants = [],
        } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Product name is required.",
            });
        }

        const validPrice = getValidPrice(price);
        if (validPrice === null) {
            return res.status(400).json({
                success: false,
                message: "A valid product price is required.",
            });
        }

        const category = await findCategory(categoryId, categorySlug);
        if (!category) {
            return res.status(400).json({
                success: false,
                message: "A valid category is required.",
            });
        }

        let seller;
        if (req.user.role === "ADMIN" && req.body.sellerId) {
            seller = await prisma.seller.findUnique({
                where: { id: req.body.sellerId },
            });
        } else {
            seller = await prisma.seller.findUnique({
                where: { userId: req.user.id },
            });
        }

        if (!seller) {
            return res.status(400).json({
                success: false,
                message: "A valid seller profile is required.",
            });
        }

        const productStatus =
            req.user.role === "ADMIN" && ["PENDING", "APPROVED", "REJECTED"].includes(status)
                ? status
                : "PENDING";

        const product = await prisma.product.create({
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                brand: brand?.trim() || null,
                price: validPrice,
                categoryId: category.id,
                sellerId: seller.id,
                status: productStatus,
                isActive: Boolean(isActive),
                image: {
                    create: Array.isArray(images)
                        ? images
                            .filter((image) => image?.url)
                            .map((image, index) => ({
                                url: image.url,
                                position: Number.isInteger(image.position)
                                    ? image.position
                                    : index,
                            }))
                        : [],
                },
                variants: {
                    create: Array.isArray(variants)
                        ? variants
                            .filter((variant) => variant?.name && variant?.value)
                            .map((variant) => ({
                                name: variant.name.trim(),
                                value: variant.value.trim(),
                                price: variant.price === undefined
                                    ? null
                                    : getValidPrice(variant.price),
                            }))
                        : [],
                },
            },
            include: productRelations,
        });

        return res.status(201).json({
            success: true,
            message: "Product created successfully.",
            data: product,
        });
    } catch (error) {
        console.error("Create product error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to create the product.",
        });
    }
};

export const updateProduct = async (req, res) => {
    try {
        const product = await prisma.product.findUnique({
            where: { id: req.params.id },
            include: { seller: true },
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found.",
            });
        }

        if (
            req.user.role !== "ADMIN" &&
            product.seller.userId !== req.user.id
        ) {
            return res.status(403).json({
                success: false,
                message: "You cannot update this product.",
            });
        }

        const data = {};
        if (req.body.name !== undefined) {
            if (!req.body.name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Product name cannot be empty.",
                });
            }
            data.name = req.body.name.trim();
        }
        if (req.body.description !== undefined) {
            data.description = req.body.description?.trim() || null;
        }
        if (req.body.brand !== undefined) {
            data.brand = req.body.brand?.trim() || null;
        }
        if (req.body.price !== undefined) {
            const validPrice = getValidPrice(req.body.price);
            if (validPrice === null) {
                return res.status(400).json({
                    success: false,
                    message: "A valid product price is required.",
                });
            }
            data.price = validPrice;
        }
        if (req.body.isActive !== undefined) {
            data.isActive = Boolean(req.body.isActive);
        }
        if (
            req.user.role === "ADMIN" &&
            ["PENDING", "APPROVED", "REJECTED"].includes(req.body.status)
        ) {
            data.status = req.body.status;
        }
        if (req.body.categoryId !== undefined || req.body.categorySlug !== undefined) {
            const category = await findCategory(
                req.body.categoryId,
                req.body.categorySlug,
            );
            if (!category) {
                return res.status(400).json({
                    success: false,
                    message: "A valid category is required.",
                });
            }
            data.categoryId = category.id;
        }

        if (Array.isArray(req.body.images)) {
            data.image = {
                deleteMany: {},
                create: req.body.images
                    .filter((image) => image?.url)
                    .map((image, index) => ({
                        url: image.url,
                        position: Number.isInteger(image.position)
                            ? image.position
                            : index,
                    })),
            };
        }

        if (Array.isArray(req.body.variants)) {
            data.variants = {
                deleteMany: {},
                create: req.body.variants
                    .filter((variant) => variant?.name && variant?.value)
                    .map((variant) => ({
                        name: variant.name.trim(),
                        value: variant.value.trim(),
                        price: variant.price === undefined
                            ? null
                            : getValidPrice(variant.price),
                    })),
            };
        }

        const updatedProduct = await prisma.product.update({
            where: { id: req.params.id },
            data,
            include: productRelations,
        });

        return res.status(200).json({
            success: true,
            message: "Product updated successfully.",
            data: updatedProduct,
        });
    } catch (error) {
        console.error("Update product error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to update the product.",
        });
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const product = await prisma.product.findUnique({
            where: { id: req.params.id },
            include: { seller: true },
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found.",
            });
        }

        if (
            req.user.role !== "ADMIN" &&
            product.seller.userId !== req.user.id
        ) {
            return res.status(403).json({
                success: false,
                message: "You cannot delete this product.",
            });
        }

        await prisma.product.delete({
            where: { id: req.params.id },
        });

        return res.status(200).json({
            success: true,
            message: "Product deleted successfully.",
        });
    } catch (error) {
        console.error("Delete product error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to delete the product.",
        });
    }
};
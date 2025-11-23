import { Router } from "express";
import { Carousel } from "../models/index.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import multer from 'multer';
import path from 'path';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/carousels/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'carousel-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

export const carouselsRouter = Router();

// This route is called by your Flutter app - DO NOT CHANGE
carouselsRouter.get("/home/crousel-imagess", async (req, res, next) => {
    try {
        const carouselImages = await Carousel.findAll({
            where: { is_active: true },
            order: [['order_index', 'ASC']],
            attributes: ['image_url']
        });
        
        // Your Flutter app expects array of image URLs
        const images = carouselImages.map(item => 
            `${req.protocol}://${req.get('host')}${item.image_url}`
        );
        
        // Your Flutter app expects at least 3 images, otherwise empty array
        if (images.length >= 3) {
            res.json(images);
        } else {
            res.json([]);
        }
    } catch (error) {
        console.error('Error fetching carousel images:', error);
        res.json([]);
    }
});

// Admin routes
carouselsRouter.get("/", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const carousels = await Carousel.findAll({
            order: [['order_index', 'ASC']]
        });
        
        // Add full URL to images for admin panel
        const carouselsWithFullUrls = carousels.map(carousel => ({
            ...carousel.toJSON(),
            image_url: `${req.protocol}://${req.get('host')}${carousel.image_url}`
        }));
        
        res.json({ data: carouselsWithFullUrls });
    } catch (error) {
        next(error);
    }
});

carouselsRouter.get("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const carousel = await Carousel.findByPk(req.params.id);
        if (!carousel) {
            return res.status(404).json({ error: "Carousel not found" });
        }
        
        // Add full URL to image
        const carouselWithFullUrl = {
            ...carousel.toJSON(),
            image_url: `${req.protocol}://${req.get('host')}${carousel.image_url}`
        };
        
        res.json({ data: carouselWithFullUrl });
    } catch (error) {
        next(error);
    }
});

carouselsRouter.post("/", requireAuth, requireRole("admin"), upload.single('image'), async (req, res, next) => {
    try {
        const { title, description, link, order_index, is_active } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ error: "Image is required" });
        }
        
        const imagePath = `/uploads/carousels/${req.file.filename}`;
        
        let finalOrderIndex = order_index;
        if (finalOrderIndex === undefined) {
            const maxOrder = await Carousel.max('order_index');
            finalOrderIndex = (maxOrder || 0) + 1;
        }
        
        const carousel = await Carousel.create({
            image_url: imagePath,
            title: title || null,
            description: description || null,
            link: link || null,
            order_index: finalOrderIndex,
            is_active: is_active !== undefined ? is_active : true
        });
        
        // Add full URL to image in response
        const carouselWithFullUrl = {
            ...carousel.toJSON(),
            image_url: `${req.protocol}://${req.get('host')}${carousel.image_url}`
        };
        
        res.status(201).json({ data: carouselWithFullUrl });
    } catch (error) {
        next(error);
    }
});

carouselsRouter.put("/:id", requireAuth, requireRole("admin"), upload.single('image'), async (req, res, next) => {
    try {
        const { title, description, link, order_index, is_active } = req.body;
        
        const carousel = await Carousel.findByPk(req.params.id);
        if (!carousel) {
            return res.status(404).json({ error: "Carousel not found" });
        }
        
        const updateData = {
            title: title !== undefined ? title : carousel.title,
            description: description !== undefined ? description : carousel.description,
            link: link !== undefined ? link : carousel.link,
            order_index: order_index !== undefined ? order_index : carousel.order_index,
            is_active: is_active !== undefined ? is_active : carousel.is_active
        };
        
        // Only update image if a new file was uploaded
        if (req.file) {
            updateData.image_url = `/uploads/carousels/${req.file.filename}`;
        }
        
        await carousel.update(updateData);
        
        // Add full URL to image in response
        const carouselWithFullUrl = {
            ...carousel.toJSON(),
            image_url: `${req.protocol}://${req.get('host')}${carousel.image_url}`
        };
        
        res.json({ data: carouselWithFullUrl });
    } catch (error) {
        next(error);
    }
});

carouselsRouter.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const carousel = await Carousel.findByPk(req.params.id);
        if (!carousel) {
            return res.status(404).json({ error: "Carousel not found" });
        }
        
        await carousel.destroy();
        res.json({ message: "Carousel deleted successfully" });
    } catch (error) {
        next(error);
    }
});

carouselsRouter.put("/order/update", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const { updates } = req.body;
        
        for (const update of updates) {
            await Carousel.update(
                { order_index: update.order_index },
                { where: { id: update.id } }
            );
        }
        
        res.json({ message: "Order updated successfully" });
    } catch (error) {
        next(error);
    }
});
import { Router } from "express";
import { Dialog } from "../models/index.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { Op } from "sequelize";
import multer from 'multer';
import path from 'path';



const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/dialogs/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'dialog-' + uniqueSuffix + path.extname(file.originalname));
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
    fileSize: 5 * 1024 * 1024 
  }
});

export const dialogsRouter = Router();


dialogsRouter.get("/dialog-data", async (req, res, next) => {
    try {
        const now = new Date();
        
        const activeDialog = await Dialog.findOne({
            where: {
                show_dialog: true,
                is_active: true,
            },
            order: [['createdAt', 'DESC']]
        });

        if (activeDialog) {
            const baseUrl = `https://afghan-topup.com/admin/public`;
            const imageUrl = activeDialog.image 
                ? `${baseUrl}${activeDialog.image}`
                : null;
           
            res.json({
                showDialog: true,
                image: imageUrl,
                title: activeDialog.title,
                description: activeDialog.description
            });
        } else {
            res.json({
                showDialog: false
            });
        }
    } catch (error) {
        console.error('Error fetching dialog data:', error);
        res.json({
            showDialog: false
        });
    }
});

dialogsRouter.get("/", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const dialogs = await Dialog.findAll({
            order: [['createdAt', 'DESC']]
        });
        
   
        const dialogsWithFullUrls = dialogs.map(dialog => ({
            ...dialog.toJSON(),
            image: dialog.image ? `https://afghan-topup.com/admin/public${dialog.image}` : null
        }));
        
        res.json({ data: dialogsWithFullUrls });
    } catch (error) {
        next(error);
    }
});

dialogsRouter.get("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const dialog = await Dialog.findByPk(req.params.id);
        if (!dialog) {
            return res.status(404).json({ error: "Dialog not found" });
        }
        
    
        const dialogWithFullUrl = {
            ...dialog.toJSON(),
            image: dialog.image ? `https://afghan-topup.com/admin/public${dialog.image}` : null
        };
        
        res.json({ data: dialogWithFullUrl });
    } catch (error) {
        next(error);
    }
});

dialogsRouter.post("/", requireAuth, requireRole("admin"), upload.single('image'), async (req, res, next) => {
    try {
        const { title, description, show_dialog, is_active, start_date, end_date } = req.body;
        
        const imagePath = req.file ? `/uploads/dialogs/${req.file.filename}` : null;
        
        const dialog = await Dialog.create({
            title,
            description,
            image: imagePath,
            show_dialog: show_dialog || false,
            is_active: is_active !== undefined ? is_active : true,
            start_date: start_date || null,
            end_date: end_date || null
        });
        
      
        const dialogWithFullUrl = {
            ...dialog.toJSON(),
            image: dialog.image ? `https://afghan-topup.com/admin/public${dialog.image}` : null
        };
        
        res.status(201).json({ data: dialogWithFullUrl });
    } catch (error) {
        next(error);
    }
});

dialogsRouter.put("/:id", requireAuth, requireRole("admin"), upload.single('image'), async (req, res, next) => {
    try {
        const { title, description, show_dialog, is_active, start_date, end_date } = req.body;
        
        const dialog = await Dialog.findByPk(req.params.id);
        if (!dialog) {
            return res.status(404).json({ error: "Dialog not found" });
        }
        
        const updateData = {
            title: title !== undefined ? title : dialog.title,
            description: description !== undefined ? description : dialog.description,
            show_dialog: show_dialog !== undefined ? show_dialog : dialog.show_dialog,
            is_active: is_active !== undefined ? is_active : dialog.is_active,
            start_date: start_date !== undefined ? start_date : dialog.start_date,
            end_date: end_date !== undefined ? end_date : dialog.end_date
        };
        
        if (req.file) {
            updateData.image = `/uploads/dialogs/${req.file.filename}`;
        }
        
        await dialog.update(updateData);
        
   
        const dialogWithFullUrl = {
            ...dialog.toJSON(),
            image: dialog.image ? `https://afghan-topup.com/admin/public${dialog.image}` : null
        };
        
        res.json({ data: dialogWithFullUrl });
    } catch (error) {
        next(error);
    }
});

dialogsRouter.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const dialog = await Dialog.findByPk(req.params.id);
        if (!dialog) {
            return res.status(404).json({ error: "Dialog not found" });
        }
        
        await dialog.destroy();
        res.json({ message: "Dialog deleted successfully" });
    } catch (error) {
        next(error);
    }
});

dialogsRouter.patch("/:id/toggle", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const dialog = await Dialog.findByPk(req.params.id);
        if (!dialog) {
            return res.status(404).json({ error: "Dialog not found" });
        }
        
        await dialog.update({
            show_dialog: !dialog.show_dialog
        });
 
        const dialogWithFullUrl = {
            ...dialog.toJSON(),
            image: dialog.image ? `https://afghan-topup.com/admin/public${dialog.image}` : null
        };
        
        res.json({ data: dialogWithFullUrl });
    } catch (error) {
        next(error);
    }
});
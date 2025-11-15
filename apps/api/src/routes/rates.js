import { Router } from "express";
import { DingRate, getRateSyncService } from "../models/index.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";

const router = Router();


router.get("/", async (req, res) => {
  try {
    const rates = await DingRate.findAll({
      order: [['name', 'ASC'], ['prefix', 'ASC']]
    });
    
    res.json({
      data: rates,
      total: rates.length
    });
  } catch (error) {
    console.error('Error fetching rates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.get("/active", async (req, res) => {
  try {
    const rates = await DingRate.findAll({
      where: { isActive: true },
      order: [['name', 'ASC'], ['prefix', 'ASC']]
    });
    
    res.json({
      data: rates,
      total: rates.length
    });
  } catch (error) {
    console.error('Error fetching active rates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post("/sync", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const rateSyncService = getRateSyncService();
    const results = await rateSyncService.manualSync();
    
    res.json({
      message: 'Rate sync completed successfully',
      data: results
    });
  } catch (error) {
    console.error('Error syncing rates:', error);
    res.status(500).json({ error: 'Rate sync failed: ' + error.message });
  }
});


router.put("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { rate, isActive, autoSyncInterval } = req.body;

    const rateRecord = await DingRate.findByPk(id);
    if (!rateRecord) {
      return res.status(404).json({ error: "Rate not found" });
    }

    const updateData = {};
    if (rate !== undefined) updateData.rate = parseFloat(rate);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (autoSyncInterval !== undefined) updateData.autoSyncInterval = parseInt(autoSyncInterval);

    await rateRecord.update(updateData);

  
    if (autoSyncInterval !== undefined) {
      const rateSyncService = getRateSyncService();
      await rateSyncService.scheduleAutoSync(rateRecord);
    }

    res.json({
      message: 'Rate updated successfully',
      data: rateRecord
    });
  } catch (error) {
    console.error('Error updating rate:', error);
    res.status(500).json({ error: 'Failed to update rate' });
  }
});


router.put("/:skuCode/:prefix/sync-interval", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { skuCode, prefix } = req.params;
    const { interval } = req.body;

    if (![1, 2, 3, 6, 12, 24, 0].includes(parseInt(interval))) {
      return res.status(400).json({ error: 'Invalid interval. Must be 0, 1, 2, 3, 6, 12, or 24 hours' });
    }

    const rateSyncService = getRateSyncService();
    const updatedRate = await rateSyncService.updateSyncInterval(skuCode, prefix, parseInt(interval));

    res.json({
      message: `Auto-sync interval updated to ${interval} hours`,
      data: updatedRate
    });
  } catch (error) {
    console.error('Error updating sync interval:', error);
    res.status(500).json({ error: error.message });
  }
});


router.get("/sync/jobs", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const rateSyncService = getRateSyncService();
    const jobs = rateSyncService.getActiveJobs();
    res.json({ data: jobs });
  } catch (error) {
    console.error('Error fetching sync jobs:', error);
    res.status(500).json({ error: 'Failed to fetch sync jobs' });
  }
});

export { router as ratesRouter };
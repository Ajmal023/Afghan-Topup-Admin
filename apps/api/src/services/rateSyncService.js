import { CronJob } from 'cron';
import DailyRateChecker from './providers/topups/daily-rate-checker.js';

class RateSyncService {
  constructor(models) {
    this.models = models;
    this.dailyRateChecker = new DailyRateChecker();
    this.jobs = new Map();
  }

  async initializeAutoSync() {
    console.log('Initializing auto-sync for Ding rates...');
    
    try {
      const activeRates = await this.models.DingRate.findAll({
        where: { isActive: true }
      });

      for (const rate of activeRates) {
        await this.scheduleAutoSync(rate);
      }

      console.log(`Auto-sync initialized for ${activeRates.length} providers`);
    } catch (error) {
      console.error(' Error initializing auto-sync:', error);
      throw error;
    }
  }

  async scheduleAutoSync(rate) {
    const jobId = `${rate.skuCode}_${rate.prefix}`;
    

    if (this.jobs.has(jobId)) {
      this.jobs.get(jobId).stop();
      this.jobs.delete(jobId);
    }

    if (rate.autoSyncInterval > 0) {
      const cronPattern = this.getCronPattern(rate.autoSyncInterval);
      
      const job = new CronJob(cronPattern, async () => {
        console.log(`Auto-syncing rates for ${rate.name} (${rate.prefix})...`);
        try {
          await this.dailyRateChecker.checkDailyRates(this.models.DingRate);
        } catch (error) {
          console.error(` Auto-sync failed for ${rate.name}:`, error.message);
        }
      });

      job.start();
      this.jobs.set(jobId, job);
      
      console.log(`Scheduled auto-sync for ${rate.name} every ${rate.autoSyncInterval} hour(s)`);
    }
  }

  getCronPattern(hours) {
    if (hours === 1) return '0 * * * *'; 
    if (hours === 2) return '0 */2 * * *'; 
    if (hours === 3) return '0 */3 * * *'; 
    if (hours === 6) return '0 */6 * * *'; 
    if (hours === 12) return '0 */12 * * *'; 
    return '0 0 * * *'; 
  }

  async manualSync() {
    console.log('Starting manual rate sync...');
    try {
      const results = await this.dailyRateChecker.checkDailyRates(this.models.DingRate);
      console.log('Manual rate sync completed');
      return results;
    } catch (error) {
      console.error('Manual rate sync failed:', error);
      throw error;
    }
  }

  async updateSyncInterval(skuCode, prefix, intervalHours) {
    const rate = await this.models.DingRate.findOne({
      where: { skuCode, prefix }
    });

    if (!rate) {
      throw new Error(`Rate not found for SKU: ${skuCode}, prefix: ${prefix}`);
    }

    await rate.update({ autoSyncInterval: intervalHours });
    await this.scheduleAutoSync(rate);

    return rate;
  }

  getActiveJobs() {
    return Array.from(this.jobs.entries()).map(([jobId, job]) => ({
      jobId,
      running: job.running
    }));
  }
}

export default RateSyncService;
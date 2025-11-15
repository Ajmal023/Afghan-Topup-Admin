import { dingTopupProvider } from './ding.js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

class DailyRateChecker {
  constructor() {
    this.resultsFile = './daily-rates.json';
    this.testAmounts = [7];
    this.providers = [
      { phone: '0700000001', name: 'AWCC', sku: 'AF_AW_TopUp', prefix: '70' },
      { phone: '0710000001', name: 'AWCC', sku: 'AF_AW_TopUp', prefix: '71' },
      { phone: '0730000001', name: 'ETISALAT', sku: 'AF_ET_TopUp', prefix: '73' },
      { phone: '0780000001', name: 'ETISALAT', sku: 'AF_ET_TopUp', prefix: '78' },
      { phone: '0790000001', name: 'ROSHAN', sku: 'AF_RH_TopUp', prefix: '79' },
      { phone: '0728287598', name: 'ROSHAN', sku: 'AF_RH_TopUp', prefix: '72' },
      { phone: '0770000001', name: 'MTN', sku: 'AF_MT_TopUp', prefix: '77' },
      { phone: '0760000001', name: 'MTN', sku: 'AF_MT_TopUp', prefix: '76' },
    ];
  }

  async checkDailyRates(DingRate) {
    console.log('DAILY RATE CHECK - ' + new Date().toISOString() + '\n');
    
    const dailyResults = {
      date: new Date().toISOString(),
      rates: [],
      summary: {}
    };
    
    try {
      const balance = await dingTopupProvider.getBalance();
      console.log(`Current Balance: ${balance.balance} ${balance.currency}\n`);
      
      if (balance.balance < 1) {
        console.log('❌ Insufficient balance for rate checking');
        return;
      }
      
      for (const provider of this.providers) {
        console.log(`Checking rates for ${provider.name} (${provider.prefix})...`);
        
        const providerRates = [];
        
        for (const amount of this.testAmounts) {
          console.log(`   Testing ${amount} USD...`);
          
          try {
            const validation = await dingTopupProvider.validateTopup({
              phoneNumber: provider.phone,
              amount: amount,
              skuCode: provider.sku
            });
            
            if (validation.status === 'success') {
              const exchangeRate = validation.estimated_receive / amount;
              const rateData = {
                provider: provider.name,
                sendAmount: amount,
                sendCurrency: 'USD',
                receiveAmount: validation.estimated_receive,
                receiveCurrency: 'AFN',
                exchangeRate: exchangeRate,
                timestamp: new Date().toISOString(),
                skuCode: provider.sku,
                prefix: provider.prefix
              };
              
              providerRates.push(rateData);
              
              console.log(` ${amount} USD → ${validation.estimated_receive} AFN`);
              console.log(`        Rate: ${rateData.exchangeRate.toFixed(2)} AFN/USD`);
            } else {
              console.log(` Failed: ${validation.error_message}`);
            }
          } catch (error) {
            console.log(` Error: ${error.message}`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        dailyResults.rates.push(...providerRates);
        
        if (providerRates.length > 0) {
          const avgRate = providerRates.reduce((sum, rate) => sum + rate.exchangeRate, 0) / providerRates.length;

          await DingRate.upsert({
            name: provider.name,
            skuCode: provider.sku,
            prefix: provider.prefix,
            rate: parseFloat(avgRate.toFixed(2)),
            lastSynced: new Date(),
            isActive: true
          }, {
            where: {
              skuCode: provider.sku,
              prefix: provider.prefix
            }
          });
          
          dailyResults.summary[provider.name] = {
            averageRate: avgRate.toFixed(2),
            ratesTested: providerRates.length
          };
        }
        
        console.log('');
      }
      
      this.saveResults(dailyResults);
      this.displaySummary(dailyResults);
      
      return dailyResults;
      
    } catch (error) {
      console.log('Error during rate check:', error.message);
      throw error;
    }
  }
  
  saveResults(results) {
    let allResults = [];
    
    if (fs.existsSync(this.resultsFile)) {
      try {
        const existingData = fs.readFileSync(this.resultsFile, 'utf8');
        allResults = JSON.parse(existingData);
      } catch (error) {
        console.log('Creating new results file...');
      }
    }
    
    allResults.push(results);
    
    if (allResults.length > 30) {
      allResults = allResults.slice(-30);
    }
    
    fs.writeFileSync(this.resultsFile, JSON.stringify(allResults, null, 2));
    console.log(`Results saved to: ${this.resultsFile}`);
  }
  
  displaySummary(results) {
    console.log('\nDAILY RATES SUMMARY');
    console.log('=====================');
    
    Object.keys(results.summary).forEach(provider => {
      console.log(`${provider}:`);
      console.log(`   Average Rate: ${results.summary[provider].averageRate} AFN/USD`);
      console.log(`   Tests Completed: ${results.summary[provider].ratesTested}`);
    });
    
    console.log(`\nTotal rate checks: ${results.rates.length}`);
    console.log(`Date: ${new Date().toLocaleDateString()}`);
  }
}

export default DailyRateChecker;
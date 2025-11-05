import { dingTopupProvider } from './ding.js';
import dotenv from 'dotenv';

dotenv.config();

async function testAllProviders2USD() {
    console.log('TESTING ALL PROVIDERS WITH 2 USD (MINIMUM AMOUNT)\n');
    
    const testCases = [
        { number: '0728287598', provider: 'Roshan', sku: 'AF_RH_TopUp' },
        { number: '0787710623', provider: 'Etisalat', sku: 'AF_ET_TopUp' },
        { number: '0771234567', provider: 'MTN', sku: 'AF_MT_TopUp' },
        { number: '0701234567', provider: 'AWCC', sku: 'AF_AW_TopUp' },
    ];
    
    const testAmount = 2; 
    
    console.log(' Testing validation with 2 USD (minimum amount):\n');
    
    for (const test of testCases) {
        console.log(`Testing ${test.provider}: ${test.number}`);
        console.log(`   SKU: ${test.sku}, Amount: ${test.amount} USD`);
        
        try {
            const validation = await dingTopupProvider.validateTopup({
                phoneNumber: test.number,
                amount: testAmount,
                skuCode: test.sku
            });
            
            if (validation.valid) {
                console.log(` ${test.provider} - VALIDATION PASSED`);
                console.log(`  Would receive: ${validation.estimated_receive || 'unknown'} AFN`);
            } else {
                console.log(`  ${test.provider} - VALIDATION FAILED: ${validation.error_message}`);
            }
            
        } catch (error) {
            console.log(`  ${test.provider} - ERROR: ${error.message}`);
        }
        
        console.log('');
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

testAllProviders2USD().catch(console.error);
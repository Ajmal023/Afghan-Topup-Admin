import { dingTopupProvider } from './ding.js';
import dotenv from 'dotenv';

dotenv.config();

async function testAllProviders() {
    console.log('🧪 SYSTEMATIC PROVIDER TESTING\n');
    
    const testNumbers = [
        { number: '0701234567', provider: 'AWCC', prefix: '70' },
        { number: '0771234567', provider: 'MTN', prefix: '77' },
        { number: '0787710623', provider: 'Etisalat', prefix: '78' },
        { number: '0728287598', provider: 'Roshan', prefix: '72' },
    ];
    
    const testAmount = 1; 
    
    console.log('Testing all Afghan providers with 1 USD:');
    console.log('(Using test numbers, not real ones)\n');
    
    const balance = await dingTopupProvider.getBalance();
    console.log(`Current Balance: ${balance.balance} ${balance.currency}\n`);
    
    for (const test of testNumbers) {
        console.log(`Testing ${test.provider}: ${test.number}`);
        
        const skuCode = dingTopupProvider.getProviderCode(test.number);
        const providerName = dingTopupProvider.getProviderName(skuCode);
        
        console.log(`   Mapped to: ${providerName} (${skuCode})`);
        
        try {
            const validation = await dingTopupProvider.validateTopup({
                phoneNumber: test.number,
                amount: testAmount,
                skuCode: skuCode
            });
            
            if (validation.valid) {
                console.log(`${providerName} - VALIDATION PASSED`);
                console.log(` Would send: ${testAmount} USD`);
                console.log(`  Would receive: ${validation.estimated_receive || 'unknown'} AFN`);
            } else {
                console.log(` ${providerName} - VALIDATION FAILED: ${validation.error_message}`);
            }
            
        } catch (error) {
            console.log(`${providerName} - ERROR: ${error.message}`);
        }
        
        console.log(''); 
        await new Promise(resolve => setTimeout(resolve, 2000)); 
    }
    
    console.log('SUMMARY:');
    console.log(' Use Etisalat numbers (078...) for now');
    console.log(' Contact Ding support to enable other providers');
}

testAllProviders().catch(console.error);
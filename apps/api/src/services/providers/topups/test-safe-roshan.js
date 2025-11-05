import { dingTopupProvider } from './ding.js';
import dotenv from 'dotenv';

dotenv.config();

async function testRoshanFixed() {
    console.log('TESTING ROSHAN WITH CORRECT SKU: AF_RH_TopUp\n');
    
    const testPhone = '0728287598';
    const testAmount = 2; 
    
    console.log('Test Details:');
    console.log(`   Phone: ${testPhone}`);
    console.log(`   Amount: ${testAmount} USD`);
    console.log(`   Expected: ~76 AFN credit`);
    console.log(`   SKU Code: AF_RH_TopUp (CORRECTED)`);
    console.log('');
    

    const balance = await dingTopupProvider.getBalance();
    console.log(`Current Balance: ${balance.balance} ${balance.currency}`);
    
    if (balance.balance < testAmount) {
        console.log('❌ Insufficient balance');
        return;
    }
    

    console.log('Testing with corrected Roshan SKU...');
    
    console.log('This is a REAL transaction');
    console.log('   Waiting 5 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    try {
        const result = await dingTopupProvider.topup({
            order: { id: 'roshan-fixed-' + Date.now() },
            item: { msisdn: testPhone, unit_price_minor: testAmount },
            variant: { amount_minor: testAmount },
            externalId: 'roshan-fixed-' + Date.now()
        });
        
        console.log('TRANSACTION RESULT:');
        console.log(`   Status: ${result.status}`);
        console.log(`   Processing State: ${result.processing_state}`);
        console.log(`   Send: ${result.send_value} ${result.send_currency}`);
        console.log(`   Receive: ${result.receive_value} ${result.receive_currency}`);
        console.log(`   Transaction ID: ${result.provider_txn_id}`);
        
        if (result.status === 'success') {
            console.log('\nROSHAN NOW WORKS!');
            console.log(`   ${testPhone} should receive ${result.receive_value} ${result.receive_currency}`);
            

            console.log('\n🔍 Verifying transaction...');
            setTimeout(async () => {
                const status = await dingTopupProvider.checkStatus(result.provider_txn_id);
                console.log(`   Final Status: ${status.status}`);
                console.log(`   Processing State: ${status.processing_state}`);
            }, 10000);
            
        } else {
            console.log('\nRoshan still not working');
            console.log(`   Error: ${result.error_message}`);
        }
        
    } catch (error) {
        console.log('Error:', error.message);
    }
}

testRoshanFixed().catch(console.error);
import { dingTopupProvider } from './ding.js';
import dotenv from 'dotenv';

dotenv.config();

async function testActualTopup() {
    console.log('TESTING ACTUAL TOPUP TO 0728287598\n');
    
    const testPhone = '0728287598'; 
    const testAmount = 2; 
    
    console.log('Test Details:');
    console.log('   - Phone:', testPhone);
    console.log('   - Amount:', testAmount + ' AFN');
    console.log('   - Provider: Etisalat (auto-detected)');
    console.log('   - This will make a REAL topup');
    console.log('');

 
    const skuCode = dingTopupProvider.getProviderCode(testPhone);
    const provider = dingTopupProvider.getProviderName(skuCode);
    console.log('Phone Analysis:');
    console.log('   - Clean number:', testPhone.replace(/^\+93|^93/, '').slice(-9));
    console.log('   - Provider:', provider);
    console.log('   - SKU Code:', skuCode);
    console.log('');


    console.log('WARNING: This will make a REAL topup of 50 AFN');
    console.log('   Money will be deducted from your Ding balance');
    console.log('   Proceeding in 5 seconds...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    try {
        console.log('Sending topup request to Ding...');
        
        const result = await dingTopupProvider.topup({
            order: { id: 'live-test-' + Date.now() },
            item: {
                msisdn: testPhone,
                unit_price_minor: testAmount
            },
            variant: {
                amount_minor: testAmount
            },
            externalId: 'live-test-' + Date.now()
        });
        
        console.log('\nTOPUP RESULT:');
        console.log('   - Status:', result.status);
        console.log('   - Provider TXN ID:', result.provider_txn_id);
        console.log('   - Processing State:', result.processing_state);
        console.log('   - Send Value:', result.send_value, result.send_currency);
        console.log('   - Receive Value:', result.receive_value, result.receive_currency);
        
        if (result.status === 'success' || result.status === 'accepted') {
            console.log('Topup initiated successfully!');
            
            if (result.ding_transfer_ref) {
                console.log('Ding Transfer Ref:', result.ding_transfer_ref);
            }
            
            if (result.processing_state === 'Complete') {
                console.log('Transaction completed immediately!');
                console.log(testPhone, 'should receive', result.receive_value, result.receive_currency);
            } else {
                console.log('Transaction is processing...');
                
          
                console.log('\nChecking status in 15 seconds...');
                setTimeout(async () => {
                    console.log('\nChecking transaction status...');
                    const status = await dingTopupProvider.checkStatus(result.provider_txn_id);
                    console.log('   Status:', status.status);
                    console.log('   Processing State:', status.processing_state);
                    
                    if (status.status === 'success') {
                        console.log('Transaction confirmed successful!');
                        console.log('Mobile topup should be delivered');
                    } else if (status.status === 'accepted') {
                        console.log('Still processing... check again later');
                    } else {
                        console.log('Transaction may have failed');
                    }
                }, 15000);
            }
            
        } else {
            console.log('Topup failed');
            console.log('Error Code:', result.error_code);
            console.log('Error Message:', result.error_message);
            
            if (result.response) {
                console.log('   Ding Response:', JSON.stringify(result.response, null, 2));
            }
        }

    } catch (error) {
        console.log('Unexpected error:', error.message);
        console.log('Stack trace:', error.stack);
    }
}


testActualTopup().catch(console.error);
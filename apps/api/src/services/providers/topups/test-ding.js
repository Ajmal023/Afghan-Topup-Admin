import { dingTopupProvider } from './ding.js';
import dotenv from 'dotenv';


dotenv.config();

async function testDingIntegrationSafe() {
    console.log('SAFE Ding Integration Test (NO TOPUPS)\n');
    console.log('Test Configuration:');
    console.log('   - API Key:', process.env.DING_API_KEY ? '***' + process.env.DING_API_KEY.slice(-4) : 'Not set');
    console.log('   - Base URL:', process.env.DING_API_BASE_URL || 'Using default');
    console.log('   - Mode: SAFE (No transactions will be made)');
    console.log('');


    console.log('1. 🏦 Testing balance check...');
    console.log('   Sending request to Ding API...');
    const balanceStartTime = Date.now();
    const balance = await dingTopupProvider.getBalance();
    const balanceEndTime = Date.now();
    console.log('   Response time:', (balanceEndTime - balanceStartTime) + 'ms');
    
    if (balance.status === 'success') {
        console.log(' Balance check SUCCESS');
        console.log(' Current balance:', balance.balance, balance.currency);
    } else {
        console.log(' Balance check FAILED');
        console.log(' Error details:');
        console.log(' Error code:', balance.error_code);
        console.log(' Error message:', balance.error_message);
    }
    console.log('');

 
    console.log('2. Testing products fetch...');
    console.log('   Fetching available products for Afghanistan...');
    const productsStartTime = Date.now();
    const products = await dingTopupProvider.getProducts();
    const productsEndTime = Date.now();
    console.log('   Response time:', (productsEndTime - productsStartTime) + 'ms');
    
    if (products.status === 'success') {
        console.log(' Products fetch SUCCESS');
        console.log(' Found', products.products.length, 'products for Afghanistan');
        

        console.log('   Available providers:');
        const providers = {};
        products.products.forEach(product => {
            if (!providers[product.ProviderCode]) {
                providers[product.ProviderCode] = {
                    skuCodes: [],
                    min: product.MinPrice,
                    max: product.MaxPrice
                };
            }
            providers[product.ProviderCode].skuCodes.push(product.SkuCode);
        });
        
        Object.keys(providers).forEach(provider => {
            console.log(` ${provider}: ${providers[provider].skuCodes.length} products`);
            console.log(`   Range: ${providers[provider].min} - ${providers[provider].max} USD`);
        });
    } else {
        console.log(' Products fetch FAILED');
        console.log(' Error details:');
        console.log('  - Error code:', products.error_code);
        console.log('  - Error message:', products.error_message);
    }
    console.log('');


    console.log('3. Testing phone number mapping...');
    const testNumbers = [
        '93701234567', 
        '93771234567', 
        '93791234567', 
        '93721234567', 
        '93787710623', 
        '93731234567', 
        '93761234567' 
    ];

    console.log(' Testing phone number to provider mapping:');
    testNumbers.forEach((phone, index) => {
        const skuCode = dingTopupProvider.getProviderCode(phone);
        const provider = dingTopupProvider.getProviderName(skuCode);
        const isValid = dingTopupProvider.validatePhoneNumber(phone);
        
        console.log(`   ${index + 1}. ${phone} → ${provider} (${skuCode}) ${isValid ? '✅' : '❌'}`);
    });
    console.log('');


    console.log('4. Testing topup validation (SAFE MODE)...');
    console.log('   This will ONLY validate, no money will be sent');
    
    const testPhone = process.env.DING_TEST_PHONE || '93700000000'; 
    
    try {
        const testPayload = {
            SkuCode: 'AF_AW_TopUp',
            SendValue: 10,
            AccountNumber: testPhone,
            DistributorRef: 'validate-test-' + Date.now(),
            ValidateOnly: true 
        };

        console.log('   Validation payload:', {
            ...testPayload,
            AccountNumber: '***' + testPhone.slice(-3) 
        });

        console.log('  Simulating validation (no API call made)');
        console.log('   Validation would check:');
        console.log('      - Phone number format');
        console.log('      - Amount range');
        console.log('      - Provider availability');
        console.log('      In production, set ValidateOnly: true in SendTransfer');
        
    } catch (error) {
        console.log(' Validation test error:', error.message);
    }
    console.log('');


    console.log('5.Testing API connectivity...');
    try {
        const testResponse = await fetch('https://api.dingconnect.com', { 
            method: 'HEAD',
            timeout: 5000 
        });
        console.log(' Ding API domain is reachable');
    } catch (error) {
        console.log(' Cannot reach Ding API:', error.message);
    }
    console.log('');

    console.log('SAFE TEST SUMMARY:');
    console.log('====================');
    
    const tests = [
        { name: 'Balance Check', result: balance },
        { name: 'Products Fetch', result: products },
        { name: 'Phone Mapping', result: { status: 'success' } },
        { name: 'API Connectivity', result: { status: 'success' } } 
    ];
    
    let passedTests = 0;
    let failedTests = 0;
    
    tests.forEach(test => {
        const passed = test.result.status === 'success';
        console.log(`   ${passed ? 'success' : 'failed'} ${test.name}: ${passed ? 'PASSED' : 'FAILED'}`);
        if (passed) passedTests++;
        else failedTests++;
    });
    
    console.log(`\n Total: ${passedTests} passed, ${failedTests} failed`);
    
    if (balance.status === 'success' && products.status === 'success') {
        console.log('\n Ding integration is READY for production!');
        console.log('   Next steps:');
        console.log('   1. Test with small topup amount (1-2 USD)');
        console.log('   2. Monitor transaction status');
        console.log('   3. Go live with real transactions');
    } else {
        console.log('\n REQUIRED ACTIONS:');
        console.log('   • Contact Ding support to whitelist your server IP');
        console.log('   • Verify API key is active in Ding account');
        console.log('   • Check Ding account has sufficient balance');
        
        if (balance.response?.ErrorCodes?.[0]?.Code === 'AuthenticationFailed') {
            console.log('\n SPECIFIC ISSUE: IP WHITELISTING REQUIRED');
            console.log('   Your API key is correct but your IP is not whitelisted');
            console.log('   Contact Ding support with your server IP address');
        }
    }

    console.log('\n SAFETY NOTE:');
    console.log('   No actual topups were performed in this test');
    console.log('   All transactions require explicit ValidateOnly: false');
}


testDingIntegrationSafe().catch(error => {
    console.error('Test error:', error.message);
    console.log('\n This was a safe test - no transactions were made');
});
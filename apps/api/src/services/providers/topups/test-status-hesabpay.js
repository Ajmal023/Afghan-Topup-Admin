import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

function getAuthHeader(clientId, clientSecret) {
    const credentials = `${clientId}:${clientSecret}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

/**
 * Test status check for specific transaction
 */
async function testSpecificTransaction() {
    const endpoint = process.env.HESABPAY_STATUS_ENDPOINT;
    const clientId = process.env.HESABPAY_CLIENT_ID;
    const clientSecret = process.env.HESABPAY_CLIENT_SECRET;
    const bankHeader = process.env.HESABPAY_BANK_HEADER;
    const authHeader = getAuthHeader(clientId, clientSecret);

    // Use the specific transaction details you provided
    const testRRN = '279020';
    const testTxnId = '0516762001762616130';

    console.log('='.repeat(70));
    console.log('🔍 CHECKING SPECIFIC TRANSACTION STATUS');
    console.log('='.repeat(70));
    console.log('   RRN:', testRRN);
    console.log('   Transaction ID:', testTxnId);
    console.log('='.repeat(70));

    const payload = {
        rrn: testRRN,
        txn_id: testTxnId
    };

    console.log('\n📤 Sending status check request...');
    console.log('Request Payload:', JSON.stringify(payload, null, 2));

    let startTime; // Declare startTime here
    
    try {
        startTime = Date.now(); // Initialize startTime
        const response = await axios.post(endpoint, payload, {
            headers: {
                "Authorization": authHeader,
                "bank": bankHeader,
                "Content-Type": "application/json"
            },
            timeout: 15_000
        });
        const responseTime = Date.now() - startTime;

        console.log('✅ REQUEST SUCCESSFUL');
        console.log('⏱️  Response Time:', responseTime + 'ms');
        console.log('📊 HTTP Status:', response.status);
        
        console.log('\n📄 RESPONSE DATA:');
        console.log(JSON.stringify(response.data, null, 2));

        // Analyze the response
        console.log('\n🎯 STATUS ANALYSIS:');
        if (response.data.success === true && response.data.status_code === 100) {
            console.log('✅ VALID TRANSACTION STATUS RECEIVED');
            console.log('   Transaction Status:', response.data.transaction_status);
            console.log('   Message:', response.data.message);
            console.log('   Amount:', response.data.amount);
            console.log('   Transaction ID:', response.data.txn_id);
            
            switch (response.data.transaction_status) {
                case "completed":
                    console.log('   🎉 TRANSACTION COMPLETED SUCCESSFULLY!');
                    break;
                case "pending":
                    console.log('   ⏳ TRANSACTION IS STILL PROCESSING');
                    break;
                case "failed":
                    console.log('   ❌ TRANSACTION FAILED');
                    break;
                default:
                    console.log('   🔄 UNKNOWN STATUS:', response.data.transaction_status);
            }
        } else {
            console.log('⚠️  UNEXPECTED RESPONSE FORMAT');
            console.log('   Success:', response.data.success);
            console.log('   Status Code:', response.data.status_code);
            console.log('   Message:', response.data.message);
        }

    } catch (error) {
        const responseTime = startTime ? Date.now() - startTime : 'N/A';
        
        console.log('❌ REQUEST FAILED');
        console.log('📊 HTTP Status:', error.response?.status);
        console.log('⏱️  Response Time:', responseTime + 'ms');
        
        console.log('\n📄 ERROR RESPONSE:');
        console.log(JSON.stringify(error.response?.data, null, 2));

        // Analyze the error
        console.log('\n🎯 ERROR ANALYSIS:');
        if (error.response?.status === 400) {
            switch (error.response.data?.status_code) {
                case 117:
                    console.log('🔴 RRN ALREADY EXISTS');
                    console.log('   The RRN is registered but status check is blocked');
                    console.log('   💡 This is likely an API limitation');
                    break;
                case 29:
                    console.log('🔴 AUTHENTICATION ERROR');
                    console.log('   Check your client ID, secret, and bank header');
                    break;
                case 27:
                    console.log('🔴 AUTHORIZATION ERROR');
                    console.log('   Token may be missing or invalid');
                    break;
                default:
                    console.log('🔴 UNKNOWN 400 ERROR');
                    console.log('   Status Code:', error.response.data?.status_code);
            }
        } else if (error.response?.status === 404) {
            console.log('🔴 TRANSACTION NOT FOUND');
            console.log('   The RRN or Transaction ID may be incorrect');
        } else {
            console.log('🔴 NETWORK/UNKNOWN ERROR');
            console.log('   Error:', error.message);
        }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📋 SUMMARY');
    console.log('='.repeat(70));
    console.log('Transaction:', testTxnId);
    console.log('RRN:', testRRN);
    console.log('Next Steps: Check the analysis above for specific recommendations');
}

// Run the test
testSpecificTransaction().catch(console.error);
import { dingTopupProvider } from './ding.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkProducts() {
    console.log('Checking Available Ding Products for Afghanistan\n');
    
    const products = await dingTopupProvider.getProducts();
    
    if (products.status === 'success') {
        console.log(`Found ${products.products.length} products:\n`);
        
        products.products.forEach((product, index) => {
            console.log(`${index + 1}. ${product.SkuCode} (${product.ProviderCode})`);
            console.log(`   Min: ${product.MinPrice} ${product.SendCurrencyIso}`);
            console.log(`   Max: ${product.MaxPrice} ${product.SendCurrencyIso}`);
            console.log(`   Benefits: ${product.Benefits?.join(', ') || 'None'}`);
            console.log('');
        });
        

        const roshanProducts = products.products.filter(p => 
            p.ProviderCode.includes('RS') || p.SkuCode.includes('RS')
        );
        console.log(`Roshan products found: ${roshanProducts.length}`);
        
    } else {
        console.log('Failed to fetch products:', products.error_message);
    }
}

checkProducts().catch(console.error);
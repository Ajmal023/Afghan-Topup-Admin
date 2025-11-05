import { dingTopupProvider } from './ding.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkAvailableCountries() {
    console.log('Checking Available Countries in Your Ding Account\n');
    
    const products = await dingTopupProvider.getProducts();
    
    if (products.status === 'success') {
        const countries = {};
        
        products.products.forEach(product => {
            const countryCode = product.RegionCode;
            if (!countries[countryCode]) {
                countries[countryCode] = {
                    count: 0,
                    providers: new Set()
                };
            }
            countries[countryCode].count++;
            countries[countryCode].providers.add(product.ProviderCode);
        });
        
        console.log('Available Countries:');
        Object.keys(countries).sort().forEach(country => {
            console.log(`   ${country}: ${countries[country].count} products, ${countries[country].providers.size} providers`);
        });
        
   
        const topCountries = Object.entries(countries)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10);
            
        console.log('\n🏆 Top 10 Available Countries:');
        topCountries.forEach(([country, data], index) => {
            console.log(`   ${index + 1}. ${country}: ${data.count} products`);
        });
        
    } else {
        console.log('Failed to fetch products:', products.error_message);
    }
}

checkAvailableCountries().catch(console.error);

import { sequelize } from '../models/index.js';
import { Currency1 } from '../models/index.js';

export const seedCurrencies = async () => {
    try {
      const currencies = [
            { currency_code: 'USD', currency_name: 'US Dollar', currency_country: 'United States', rate: 1.0000 },
            { currency_code: 'EUR', currency_name: 'Euro', currency_country: 'European Union', rate: 0.9200 },
            { currency_code: 'GBP', currency_name: 'British Pound', currency_country: 'United Kingdom', rate: 0.7900 },
            { currency_code: 'JPY', currency_name: 'Japanese Yen', currency_country: 'Japan', rate: 150.5000 },
            { currency_code: 'CHF', currency_name: 'Swiss Franc', currency_country: 'Switzerland', rate: 0.8800 },
            { currency_code: 'CAD', currency_name: 'Canadian Dollar', currency_country: 'Canada', rate: 1.3500 },
            { currency_code: 'AUD', currency_name: 'Australian Dollar', currency_country: 'Australia', rate: 1.5200 },
            { currency_code: 'NZD', currency_name: 'New Zealand Dollar', currency_country: 'New Zealand', rate: 1.6300 },

            { currency_code: 'CNY', currency_name: 'Chinese Yuan', currency_country: 'China', rate: 7.2000 },
            { currency_code: 'INR', currency_name: 'Indian Rupee', currency_country: 'India', rate: 83.0000 },
            { currency_code: 'AFN', currency_name: 'Afghan Afghani', currency_country: 'Afghanistan', rate: 70.0000 },
            { currency_code: 'PKR', currency_name: 'Pakistani Rupee', currency_country: 'Pakistan', rate: 280.0000 },
            { currency_code: 'BDT', currency_name: 'Bangladeshi Taka', currency_country: 'Bangladesh', rate: 110.0000 },
            { currency_code: 'LKR', currency_name: 'Sri Lankan Rupee', currency_country: 'Sri Lanka', rate: 320.0000 },
            { currency_code: 'NPR', currency_name: 'Nepalese Rupee', currency_country: 'Nepal', rate: 133.0000 },
            { currency_code: 'BTN', currency_name: 'Bhutanese Ngultrum', currency_country: 'Bhutan', rate: 83.0000 },
            { currency_code: 'MVR', currency_name: 'Maldivian Rufiyaa', currency_country: 'Maldives', rate: 15.4000 },
            
      
            { currency_code: 'AED', currency_name: 'UAE Dirham', currency_country: 'United Arab Emirates', rate: 3.6700 },
            { currency_code: 'SAR', currency_name: 'Saudi Riyal', currency_country: 'Saudi Arabia', rate: 3.7500 },
            { currency_code: 'QAR', currency_name: 'Qatari Riyal', currency_country: 'Qatar', rate: 3.6400 },
            { currency_code: 'OMR', currency_name: 'Omani Rial', currency_country: 'Oman', rate: 0.3845 },
            { currency_code: 'KWD', currency_name: 'Kuwaiti Dinar', currency_country: 'Kuwait', rate: 0.3075 },
            { currency_code: 'BHD', currency_name: 'Bahraini Dinar', currency_country: 'Bahrain', rate: 0.3760 },
            
        
            { currency_code: 'SGD', currency_name: 'Singapore Dollar', currency_country: 'Singapore', rate: 1.3400 },
            { currency_code: 'MYR', currency_name: 'Malaysian Ringgit', currency_country: 'Malaysia', rate: 4.7200 },
            { currency_code: 'THB', currency_name: 'Thai Baht', currency_country: 'Thailand', rate: 36.5000 },
            { currency_code: 'IDR', currency_name: 'Indonesian Rupiah', currency_country: 'Indonesia', rate: 15600.0000 },
            { currency_code: 'VND', currency_name: 'Vietnamese Dong', currency_country: 'Vietnam', rate: 24500.0000 },
            { currency_code: 'PHP', currency_name: 'Philippine Peso', currency_country: 'Philippines', rate: 56.0000 },
            
         
            { currency_code: 'ZAR', currency_name: 'South African Rand', currency_country: 'South Africa', rate: 18.5000 },
            { currency_code: 'EGP', currency_name: 'Egyptian Pound', currency_country: 'Egypt', rate: 30.9000 },
            { currency_code: 'NGN', currency_name: 'Nigerian Naira', currency_country: 'Nigeria', rate: 1600.0000 },
            { currency_code: 'KES', currency_name: 'Kenyan Shilling', currency_country: 'Kenya', rate: 160.0000 },
            
     
            { currency_code: 'NOK', currency_name: 'Norwegian Krone', currency_country: 'Norway', rate: 10.5000 },
            { currency_code: 'SEK', currency_name: 'Swedish Krona', currency_country: 'Sweden', rate: 10.4000 },
            { currency_code: 'DKK', currency_name: 'Danish Krone', currency_country: 'Denmark', rate: 6.8500 },
            { currency_code: 'PLN', currency_name: 'Polish Zloty', currency_country: 'Poland', rate: 4.0000 },
            
       
            { currency_code: 'MXN', currency_name: 'Mexican Peso', currency_country: 'Mexico', rate: 17.0000 },
            { currency_code: 'BRL', currency_name: 'Brazilian Real', currency_country: 'Brazil', rate: 4.9500 },
            { currency_code: 'ARS', currency_name: 'Argentine Peso', currency_country: 'Argentina', rate: 350.0000 },
            
  
            { currency_code: 'RUB', currency_name: 'Russian Ruble', currency_country: 'Russia', rate: 92.0000 },
            { currency_code: 'UAH', currency_name: 'Ukrainian Hryvnia', currency_country: 'Ukraine', rate: 38.5000 },
            { currency_code: 'KZT', currency_name: 'Kazakhstani Tenge', currency_country: 'Kazakhstan', rate: 450.0000 },
            
       
            { currency_code: 'KRW', currency_name: 'South Korean Won', currency_country: 'South Korea', rate: 1330.0000 },
            { currency_code: 'TRY', currency_name: 'Turkish Lira', currency_country: 'Turkey', rate: 32.0000 },
            { currency_code: 'ILS', currency_name: 'Israeli Shekel', currency_country: 'Israel', rate: 3.8000 },
            { currency_code: 'HKD', currency_name: 'Hong Kong Dollar', currency_country: 'Hong Kong', rate: 7.8200 },
            { currency_code: 'TWD', currency_name: 'New Taiwan Dollar', currency_country: 'Taiwan', rate: 31.5000 },
        ];

        for (const currency of currencies) {
            await Currency1.findOrCreate({
                where: { currency_code: currency.currency_code },
                defaults: currency
            });
        }

        console.log('✅ Currency data seeded successfully');
    } catch (error) {
        console.error('❌ Error seeding currency data:', error);
        throw error;
    }
};


if (import.meta.url === `file://${process.argv[1]}`) {
    (async () => {
        try {
            await sequelize.authenticate();
            console.log('Database connected');
            await seedCurrencies();
            console.log('Seeder completed');
            process.exit(0);
        } catch (error) {
            console.error('Seeder failed:', error);
            process.exit(1);
        }
    })();
}